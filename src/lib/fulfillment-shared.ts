/** Seguimiento del envío de un pedido pagado. Sin dependencias del servidor: lo usan el admin, la página pública y los correos. */

export type Fulfillment = "" | "por_preparar" | "hacia_verificacion" | "preparando" | "despachado" | "entregado" | "incidencia";

/** Pasos que el equipo puede elegir. "" = pedido anterior al seguimiento (no se le asigna paso automáticamente). */
export const FULFILLMENT_STEPS = ["por_preparar", "hacia_verificacion", "preparando", "despachado", "entregado", "incidencia"] as const;

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  "": "Sin seguimiento",
  por_preparar: "Por preparar",
  hacia_verificacion: "En camino a verificación",
  preparando: "Verificando y empacando",
  despachado: "Despachado",
  entregado: "Entregado",
  incidencia: "Incidencia",
};

export const FULFILLMENT_CLS: Record<Fulfillment, string> = {
  "": "bg-line text-muted",
  por_preparar: "bg-amber-100 text-amber-800",
  hacia_verificacion: "bg-violet-100 text-violet-800",
  preparando: "bg-sky-100 text-sky-800",
  despachado: "bg-indigo-100 text-indigo-800",
  entregado: "bg-emerald-100 text-emerald-800",
  incidencia: "bg-accent/10 text-accent",
};

/** Cuando el equipo entrega en mano o con mensajero propio no hay número de guía. */
export const DIRECT_CARRIER = "Entrega directa";

/** Pedidos que el comprador recoge en el punto de verificación: no llevan transportadora ni guía. */
export const PICKUP_CARRIER = "Recoge en el punto";

export const CARRIERS = ["Servientrega", "Coordinadora", "Interrapidísimo", "Envía", "TCC", "Deprisa", "Mensajería local", DIRECT_CARRIER, "Otra"] as const;

/** Horas sin despachar a partir de las cuales un pedido pagado se marca como atrasado. */
export const LATE_HOURS = 48;

export const isFulfillment = (v: string): v is Fulfillment => v === "" || (FULFILLMENT_STEPS as readonly string[]).includes(v);

/** El pedido está pagado y todavía no sale (cuenta como "por despachar"). */
export const isToShip = (f: Fulfillment) => f === "por_preparar" || f === "hacia_verificacion" || f === "preparando";

/** Pedido pagado que lleva más de LATE_HOURS sin salir. */
export function isLate(f: Fulfillment, paidAt: number | null, createdAt: number): boolean {
  return isToShip(f) && Date.now() - (paidAt ?? createdAt) > LATE_HOURS * 3600_000;
}

/** Fecha corta en hora de Colombia: "3 de noviembre". */
export const shortDay = (ms: number) =>
  new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });
