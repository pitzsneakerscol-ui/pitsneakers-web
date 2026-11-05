import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";

/** Confirmación del pedido al revendedor: a dónde dejar el par y las reglas que acepta al vender. Sin dependencias del servidor. */

/** Líneas de la dirección del punto de verificación, listas para mostrar. */
export const verificationPointLines = (): string[] => [siteConfig.verificationPoint.city.toUpperCase(), ...siteConfig.verificationPoint.lines];

/** Las tres reglas que el revendedor acepta al vender con nosotros. */
export function sellerRules(): string[] {
  const { tenis, ropa } = siteConfig.commission;
  return [
    "El envío tiene que llegar pago. De lo contrario, ese valor se descuenta del dinero pendiente a consignar.",
    `Al aceptar la venta con nosotros asumes que, si tu par no pasa la verificación, tendrás que pagar de igual forma la comisión (${formatPrice(tenis.fixed)} en pares o ${ropa.percent}% en ropa y accesorios) para poder reclamar de nuevo el par.`,
    "El pago del par se verá reflejado hasta que el par pase todo el proceso de verificación.",
  ];
}
