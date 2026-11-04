import { siteConfig } from "@/config/site";
import { DIRECT_CARRIER, shortDay } from "@/lib/fulfillment-shared";
import type { CatalogOrder } from "@/lib/catalog-orders";

/** Pasos del pedido que ve el comprador (página de seguimiento y correos). Sin dependencias del servidor. */
export interface Step {
  title: string;
  text: string;
  /** dato destacado debajo del texto (guía, fecha) */
  extra?: string;
  done: boolean;
}

/** Lo último que reporta la transportadora, solo en las etapas que le dicen algo útil al comprador. */
export const LIVE: Record<string, string> = {
  picked_up: "Recogido por la transportadora",
  in_transit: "En tránsito",
  last_mile: "En ruta de entrega",
  delivery_attempt: "Intento de entrega: la transportadora volverá a intentarlo",
  delivered_to_branch: "Disponible para recoger en sucursal",
};

/** Pasos con una explicación debajo de cada uno, a partir del seguimiento del pedido. */
export function stepsFor(o: CatalogOrder): Step[] {
  const f = o.fulfillment;
  const shipped = f === "despachado" || f === "entregado" || (f === "incidencia" && o.shippedAt !== null);
  const delivered = f === "entregado";
  const preparing = f === "preparando" || shipped;
  const direct = o.carrier === DIRECT_CARRIER;

  return [
    {
      title: "Pedido confirmado",
      text: "¡Listo! Recibimos tu pago y tu pedido está confirmado.",
      extra: o.paidAt ? shortDay(o.paidAt) : undefined,
      done: true,
    },
    {
      title: "Verificado y empacado",
      text: shipped
        ? "Revisamos tu par a fondo y lo dejamos empacado."
        : preparing
          ? "Estamos revisando tu par y empacándolo con cuidado."
          : "Cada par pasa por revisión física y autenticación antes de salir.",
      done: shipped,
    },
    {
      title: direct ? "Entrega coordinada" : "Entregado a la transportadora",
      text: shipped
        ? direct
          ? "Lo entregamos directamente: te escribimos por WhatsApp para coordinar."
          : `Tu pedido salió con ${o.carrier || "la transportadora"}.${o.tracking ? " Con el número de guía puedes ver el recorrido en su página." : ""}`
        : "Cuando salga te mandamos la guía por correo.",
      extra: shipped ? [o.shippedAt ? shortDay(o.shippedAt) : "", !direct && o.tracking ? `Guía ${o.tracking}` : "", !direct && !delivered ? (LIVE[o.skyStatus] ?? "") : ""].filter(Boolean).join(" · ") || undefined : undefined,
      done: shipped,
    },
    {
      title: "Entregado en tu dirección",
      text: delivered ? "Tu pedido llegó. ¡A estrenar!" : `Cuando lo tengas, etiquétanos en Instagram ${siteConfig.instagramHandle}: nos encanta ver tus pares.`,
      extra: delivered && o.deliveredAt ? shortDay(o.deliveredAt) : undefined,
      done: delivered,
    },
  ];
}
