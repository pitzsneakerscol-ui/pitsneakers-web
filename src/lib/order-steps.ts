import { siteConfig } from "@/config/site";
import { DIRECT_CARRIER, shortDay } from "@/lib/fulfillment-shared";
import { pickupAddress } from "@/lib/delivery-shared";
import { isVerified } from "@/lib/verification-shared";
import { PAYOUT_WINDOW } from "@/lib/payout-shared";
import { formatPrice } from "@/lib/format";
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
  // El par ya llegó a nuestro punto de verificación (o ya estaba aquí) cuando se está revisando o ya salió.
  const arrived = f === "preparando" || shipped;
  // Verificado y empacado: ya salió, o está en el punto de verificación con la revisión completa guardada.
  const packed = shipped || (f === "preparando" && isVerified(o.verifChecks));
  const direct = o.carrier === DIRECT_CARRIER;
  // El comprador recoge en el punto de verificación: "despachado" significa "listo para recoger".
  const pickup = o.delivery === "recogida";

  return [
    {
      title: "Pedido confirmado",
      text: "¡Listo! Recibimos tu pago y tu pedido está confirmado.",
      extra: o.paidAt ? shortDay(o.paidAt) : undefined,
      done: true,
    },
    {
      title: "En camino a nuestro punto de verificación",
      text: arrived
        ? "Tu par ya está en nuestro punto de verificación."
        : f === "hacia_verificacion"
          ? `Tu par viene en camino a nuestro punto de verificación, donde lo revisamos antes de ${pickup ? "entregártelo" : "enviártelo"}.`
          : `Tu par llega a nuestro punto de verificación, donde lo revisamos antes de ${pickup ? "entregártelo" : "enviártelo"}.`,
      done: arrived,
    },
    {
      title: "Verificado y empacado",
      text: packed
        ? "Revisamos tu par a fondo y lo dejamos empacado."
        : f === "preparando"
          ? "Estamos revisando tu par y empacándolo con cuidado."
          : "Cada par pasa por revisión física y autenticación antes de salir.",
      extra: o.verifAt && isVerified(o.verifChecks) ? `Verificado el ${shortDay(o.verifAt)} · ${o.verifChecks.length} puntos revisados` : undefined,
      done: packed,
    },
    {
      title: pickup ? "Listo para recoger" : direct ? "Entrega coordinada" : "Entregado a la transportadora",
      text: pickup
        ? shipped
          ? `Tu pedido está listo. Recógelo en nuestro punto de verificación en ${siteConfig.verificationPoint.city}: ${pickupAddress()}. Escríbenos por WhatsApp para coordinar el día y la hora.`
          : `Cuando esté verificado te avisamos para que lo recojas en nuestro punto de verificación en ${siteConfig.verificationPoint.city}.`
        : shipped
          ? direct
            ? "Lo entregamos directamente: te escribimos por WhatsApp para coordinar."
            : `Tu pedido salió con ${o.carrier || "la transportadora"}.${o.tracking ? " Con el número de guía puedes ver el recorrido en su página." : ""}`
          : "Cuando salga te mandamos la guía por correo.",
      extra: pickup ? (shipped && o.shippedAt ? shortDay(o.shippedAt) : undefined) : shipped ? [o.shippedAt ? shortDay(o.shippedAt) : "", !direct && o.tracking ? `Guía ${o.tracking}` : "", !direct && !delivered ? (LIVE[o.skyStatus] ?? "") : ""].filter(Boolean).join(" · ") || undefined : undefined,
      done: shipped,
    },
    {
      title: pickup ? "Recogido" : "Entregado en tu dirección",
      text: delivered ? (pickup ? "Recogiste tu pedido. ¡A estrenar!" : "Tu pedido llegó. ¡A estrenar!") : `Cuando lo tengas, etiquétanos en Instagram ${siteConfig.instagramHandle}: nos encanta ver tus pares.`,
      extra: delivered && o.deliveredAt ? shortDay(o.deliveredAt) : undefined,
      done: delivered,
    },
  ];
}

/**
 * Los mismos pasos, vistos por el revendedor dueño del par: sin datos del comprador y con un último paso, el pago a él.
 * `hasPayoutInfo` indica si ya dejó dónde consignarle (sin eso no se le puede pagar).
 */
export function sellerStepsFor(o: CatalogOrder, hasPayoutInfo: boolean): Step[] {
  const f = o.fulfillment;
  const shipped = f === "despachado" || f === "entregado" || (f === "incidencia" && o.shippedAt !== null);
  const delivered = f === "entregado";
  const arrived = f === "preparando" || shipped;
  const packed = shipped || (f === "preparando" && isVerified(o.verifChecks));
  const direct = o.carrier === DIRECT_CARRIER;
  const pickup = o.delivery === "recogida";
  const paidOut = o.payoutStatus === "pagado";
  const inProcess = o.payoutStatus === "en_proceso";

  return [
    {
      title: "Venta confirmada",
      text: "El cliente ya pagó tu par. Es una venta segura.",
      extra: o.paidAt ? shortDay(o.paidAt) : undefined,
      done: true,
    },
    {
      title: "En camino a nuestro punto de verificación",
      text: arrived
        ? "Tu par ya está en nuestro punto de verificación."
        : f === "hacia_verificacion"
          ? "Tu par va en camino a nuestro punto de verificación, donde lo revisamos antes de enviarlo."
          : o.sellerConfirmedAt
            ? "Confirmamos tu venta: deja tu par en nuestro punto de verificación. El envío tiene que llegar pago."
            : "Estamos confirmando tu venta. Te avisamos con la dirección del punto de verificación donde dejar el par.",
      extra: !arrived && o.sellerConfirmedAt ? `Confirmada el ${shortDay(o.sellerConfirmedAt)}` : undefined,
      done: arrived,
    },
    {
      title: "Verificado y empacado",
      text: packed
        ? "Revisamos el par a fondo y quedó empacado."
        : f === "preparando"
          ? "Estamos revisando tu par y empacándolo con cuidado."
          : "Cada par pasa por revisión física y autenticación antes de salir.",
      extra: o.verifAt && isVerified(o.verifChecks) ? `Verificado el ${shortDay(o.verifAt)} · ${o.verifChecks.length} puntos revisados` : undefined,
      done: packed,
    },
    {
      title: pickup ? "Listo para entregar al comprador" : direct ? "Entrega coordinada" : "Entregado a la transportadora",
      text: pickup
        ? shipped
          ? "El comprador recoge su pedido en nuestro punto de verificación."
          : "El comprador recoge en nuestro punto de verificación: aquí verás cuando esté listo."
        : shipped
          ? direct
            ? "Lo entregamos directamente al comprador."
            : `El pedido salió con ${o.carrier || "la transportadora"}.`
          : "Cuando salga lo verás aquí.",
      extra: pickup ? (shipped && o.shippedAt ? shortDay(o.shippedAt) : undefined) : shipped ? [o.shippedAt ? shortDay(o.shippedAt) : "", !direct && o.tracking ? `Guía ${o.tracking}` : "", !direct && !delivered ? (LIVE[o.skyStatus] ?? "") : ""].filter(Boolean).join(" · ") || undefined : undefined,
      done: shipped,
    },
    {
      title: "Entregado al comprador",
      text: delivered ? (pickup ? "El comprador ya recogió su par." : "El comprador ya recibió su par.") : pickup ? "Cuando lo recoja lo marcamos aquí." : "Cuando llegue a su destino lo marcamos aquí.",
      extra: delivered && o.deliveredAt ? shortDay(o.deliveredAt) : undefined,
      done: delivered,
    },
    {
      title: "Pago a ti",
      text: paidOut
        ? "Ya te consignamos lo de esta venta."
        : inProcess
          ? `Estamos haciendo tu pago. Llega a tu cuenta en ${PAYOUT_WINDOW} desde que lo iniciamos.`
          : hasPayoutInfo
            ? `Pago pendiente. Te consignamos en ${PAYOUT_WINDOW} desde que se entrega el pedido.`
            : "Pago pendiente. Necesitamos tus datos de pago para consignarte: agrégalos en Cuenta.",
      extra: paidOut
        ? `${o.payoutPaidAt ? `${shortDay(o.payoutPaidAt)} · ` : ""}${formatPrice(o.payoutAmount)}`
        : o.payoutAmount > 0
          ? `Recibes ${formatPrice(o.payoutAmount)}`
          : undefined,
      done: paidOut,
    },
  ];
}
