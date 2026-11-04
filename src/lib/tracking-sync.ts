import "server-only";
import { advanceFulfillment, listTrackable, setSkyStatus, type CatalogOrder } from "@/lib/catalog-orders";
import { buyerDeliveredEmail, buyerShippedEmail, teamShipmentIssueEmail } from "@/lib/order-emails";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { getGuide, isSkydropxConfigured } from "@/lib/skydropx";
import { siteConfig } from "@/config/site";
import type { Fulfillment } from "@/lib/fulfillment-shared";

/**
 * Pasa el recorrido que reporta la transportadora (vía Skydropx) al seguimiento del pedido:
 *  - recogido / en tránsito / reparto / en sucursal → Despachado (y se le avisa al cliente con su guía)
 *  - entregado → Entregado (y se le pide la reseña)
 *  - excepción / devolución / cancelado / retenido → Incidencia (y se le avisa al equipo)
 * Nunca retrocede un pedido: si el equipo ya lo marcó entregado, queda entregado.
 */
type Target = "despachado" | "entregado" | "incidencia";

const TARGET: Record<string, Target> = {
  picked_up: "despachado",
  in_transit: "despachado",
  last_mile: "despachado",
  delivery_attempt: "despachado",
  delivered_to_branch: "despachado",
  delivered: "entregado",
  exception: "incidencia",
  in_return: "incidencia",
  canceled: "incidencia",
  destroyed: "incidencia",
  retained: "incidencia",
};

/** Texto en español del estado de la transportadora (se muestra en el panel y en el aviso al equipo). */
export const SKY_STATUS_LABEL: Record<string, string> = {
  created: "Guía creada, esperando recogida",
  picked_up: "Recogido por la transportadora",
  in_transit: "En tránsito",
  last_mile: "En ruta de entrega",
  delivery_attempt: "Intento de entrega fallido",
  delivered_to_branch: "Disponible en sucursal",
  delivered: "Entregado",
  exception: "Novedad en el envío",
  in_return: "En devolución",
  canceled: "Envío cancelado",
  destroyed: "Paquete destruido",
  retained: "Paquete retenido",
};

export const skyStatusLabel = (s: string) => SKY_STATUS_LABEL[s] ?? s;

/** Si el cambio es válido desde el paso actual (nunca se retrocede ni se pisa una incidencia manual). */
function allowed(from: Fulfillment, to: Target): boolean {
  if (from === "entregado" || from === "") return false;
  if (to === "despachado") return from === "por_preparar" || from === "hacia_verificacion" || from === "preparando";
  if (to === "entregado") return true;
  return from !== "incidencia";
}

async function mail(to: string, m: { subject: string; body: string }): Promise<void> {
  if (!isEmailConfigured()) return;
  await sendEmail({ to, subject: m.subject, body: m.body }).catch(() => undefined);
}

/**
 * Aplica un estado de recorrido a un pedido: lo guarda y, si corresponde, cambia el paso y manda los correos (una sola vez).
 * Devuelve el paso nuevo, o null si no hubo cambio.
 */
export async function applyTracking(order: CatalogOrder, skyStatus: string, tracking = "", labelUrl = ""): Promise<Target | null> {
  const status = skyStatus.trim().toLowerCase();
  await setSkyStatus(order.id, status, tracking, labelUrl);
  const to = TARGET[status];
  if (!to || !allowed(order.fulfillment, to)) return null;

  const res = await advanceFulfillment(order.id, order.fulfillment, to);
  if (!res) return null; // otro aviso ya lo cambió: no se repiten los correos

  if (to === "despachado" && res.firstShip) await mail(res.order.buyerEmail, buyerShippedEmail(res.order));
  else if (to === "entregado") await mail(res.order.buyerEmail, buyerDeliveredEmail(res.order));
  else if (to === "incidencia") await mail(siteConfig.contactEmail, teamShipmentIssueEmail(res.order, skyStatusLabel(status)));
  return to;
}

/** Consulta a Skydropx el estado de un pedido y lo aplica. Devuelve el paso nuevo, si lo hubo. */
export async function refreshOrder(order: CatalogOrder): Promise<Target | null> {
  if (!isSkydropxConfigured() || !order.skyShipmentId || order.skyShipmentId === "pending") return null;
  const g = await getGuide(order.skyShipmentId);
  return applyTracking(order, g.trackingStatus, g.tracking, g.labelUrl);
}

/** Como refreshOrder, pero solo si el pedido está en camino y lleva más de `staleMs` sin consultarse. Nunca lanza error. */
export async function refreshIfStale(order: CatalogOrder, staleMs = 10 * 60_000): Promise<void> {
  const open = order.status === "pagado" && order.fulfillment !== "entregado" && order.fulfillment !== "";
  if (!open || (order.trackedAt !== null && Date.now() - order.trackedAt < staleMs)) return;
  await refreshOrder(order).catch(() => undefined);
}

/** Respaldo por si un webhook se pierde: revisa los pedidos en camino que llevan más de `staleMs` sin consultarse. */
export async function syncTracking(opts: { staleMs?: number; limit?: number } = {}): Promise<{ revisados: number; cambios: number; errores: number }> {
  if (!isSkydropxConfigured()) return { revisados: 0, cambios: 0, errores: 0 };
  const list = await listTrackable(opts.staleMs ?? 20 * 60_000, opts.limit ?? 25);
  let cambios = 0;
  let errores = 0;
  for (const o of list) {
    try {
      if (await refreshOrder(o)) cambios++;
    } catch {
      errores++;
    }
    await new Promise((r) => setTimeout(r, 600)); // la API admite 2 solicitudes por segundo
  }
  return { revisados: list.length, cambios, errores };
}
