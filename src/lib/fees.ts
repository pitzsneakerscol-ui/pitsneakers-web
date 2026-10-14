import { siteConfig } from "@/config/site";

/** Costo de procesar un pago en línea con Wompi (tarifa + IVA sobre la tarifa). Se ajusta en siteConfig.onlineFee. */
export function wompiCost(total: number): number {
  const f = siteConfig.onlineFee;
  return Math.round((total * (f.percent / 100) + f.fixed) * (1 + f.iva / 100));
}

/**
 * Costo de procesamiento que se suma al pagar en línea para que, después de lo que cobra la pasarela,
 * a Pitsneakers le llegue completo el valor del producto. Se redondea hacia arriba a los $100.
 */
export function processingFee(base: number): number {
  if (!(base > 0)) return 0;
  const f = siteConfig.onlineFee;
  const rate = (f.percent / 100) * (1 + f.iva / 100);
  const gross = (base + f.fixed * (1 + f.iva / 100)) / (1 - rate);
  return Math.max(0, Math.ceil((gross - base) / 100) * 100);
}
