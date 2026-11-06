import { siteConfig } from "@/config/site";
import { parseShipping, type ShippingData } from "@/lib/shipping-shared";

/** Cómo recibe el comprador su pedido. Sin dependencias del servidor: lo usan el formulario, las acciones, los correos y el admin. */
export type Delivery = "envio" | "recogida";

/** Costo del envío a todo el país (COP). Recoger en el punto de verificación no lo cobra. */
export const DELIVERY_FEE = siteConfig.delivery.fee;

export const isPickup = (d: string | undefined): boolean => d === "recogida";

/** Lo que cobra la entrega según el método elegido. */
export const shipFeeFor = (d: Delivery): number => (d === "recogida" ? 0 : DELIVERY_FEE);

/** Datos que se guardan cuando el comprador recoge: así el resto del sistema (admin, correos) sigue viendo una "dirección". */
const PICKUP_SHIPPING: ShippingData = {
  department: "Bogotá D.C.",
  city: siteConfig.verificationPoint.city,
  address: "Recoge en el punto de verificación",
  complement: "",
  document: "",
  notes: "",
};

/** Dirección del punto de verificación sin el nombre ni el teléfono. Solo se muestra después de pagar. */
export const pickupAddress = (): string =>
  siteConfig.verificationPoint.lines.filter((l) => !/^(PITSNEAKERS|Tel\.)/i.test(l)).join(", ");

/** Lee cómo quiere recibir el comprador su pedido. Para el envío valida la dirección; para la recogida no la pide. */
export function parseDelivery(fd: FormData): { error: string } | { delivery: Delivery; shipFee: number; ship: ShippingData } {
  if (String(fd.get("delivery") ?? "") === "recogida") return { delivery: "recogida", shipFee: 0, ship: PICKUP_SHIPPING };
  const ship = parseShipping(fd);
  if ("error" in ship) return { error: ship.error };
  return { delivery: "envio", shipFee: DELIVERY_FEE, ship: ship.data };
}
