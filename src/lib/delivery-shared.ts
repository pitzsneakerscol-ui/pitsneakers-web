import { siteConfig } from "@/config/site";
import { parseShipping, type ShippingData } from "@/lib/shipping-shared";
import { freeShippingLive } from "@/lib/sale";

/** Cómo recibe el comprador su pedido. Sin dependencias del servidor: lo usan el formulario, las acciones, los correos y el admin. */
export type Delivery = "envio" | "recogida";

/** Costo del envío a todo el país (COP). Recoger en el punto de verificación no lo cobra. */
export const DELIVERY_FEE = siteConfig.delivery.fee;

export const isPickup = (d: string | undefined): boolean => d === "recogida";

/** Lo que cobra la entrega según el método elegido. Recoger nunca cobra; mientras corre una campaña con envío gratis, tampoco el envío. */
export const shipFeeFor = (d: Delivery): number => (d === "recogida" || freeShippingLive() ? 0 : DELIVERY_FEE);

/** Datos que se guardan cuando el comprador recoge: así el resto del sistema (admin, correos) sigue viendo una "dirección". */
const PICKUP_SHIPPING: ShippingData = {
  department: "Bogotá D.C.",
  city: siteConfig.verificationPoint.city,
  address: "Recoge en el punto de verificación",
  complement: "",
  document: "",
  notes: "",
  postal: "",
};

/** Dirección del punto de verificación sin el nombre ni el teléfono. Solo se muestra después de pagar. */
export const pickupAddress = (): string =>
  siteConfig.verificationPoint.lines.filter((l) => !/^(PITSNEAKERS|Tel\.)/i.test(l)).join(", ");

const PICKUP_PREFIX = "Recoge: ";

/** Quién recoge el pedido, guardado en las notas del envío como "Recoge: Nombre Apellido". Vacío si el pedido es anterior a este dato. */
export const pickupNameOf = (notes: string | undefined): string => (notes?.startsWith(PICKUP_PREFIX) ? notes.slice(PICKUP_PREFIX.length).trim() : "");

const cleanField = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Lee cómo quiere recibir el comprador su pedido. Para el envío valida la dirección; para la recogida pide
 * nombre y cédula de quien va a recoger (se guardan en las notas y en la cédula del pedido, sin columnas nuevas).
 */
export function parseDelivery(fd: FormData): { error: string } | { delivery: Delivery; shipFee: number; ship: ShippingData } {
  if (String(fd.get("delivery") ?? "") === "recogida") {
    const name = cleanField(fd, "pickupName", 80);
    const document = cleanField(fd, "pickupDocument", 14).replace(/[^\dA-Za-z]/g, "");
    if (name.split(" ").filter(Boolean).length < 2) return { error: "Escribe el nombre completo de quien va a recoger el pedido." };
    if (!/^\d{5,12}$/.test(document)) return { error: "Escribe la cédula de quien recoge (entre 5 y 12 números): se la pedimos al entregar el par." };
    return { delivery: "recogida", shipFee: 0, ship: { ...PICKUP_SHIPPING, document, notes: `${PICKUP_PREFIX}${name}` } };
  }
  const ship = parseShipping(fd);
  if ("error" in ship) return { error: ship.error };
  return { delivery: "envio", shipFee: shipFeeFor("envio"), ship: ship.data };
}
