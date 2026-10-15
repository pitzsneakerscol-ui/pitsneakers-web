import { siteConfig } from "@/config/site";
import type { ItemKind } from "@/lib/reseller-shared";

export interface PayoutBreakdown {
  price: number;
  commission: number;
  shipping: number;
  /** lo que recibe el vendedor: precio - comisión - envío */
  receives: number;
  commissionLabel: string;
}

/** Cuánto recibe el vendedor al vender a un precio: pares = comisión fija + envío aprox.; ropa y accesorios = porcentaje. */
export function sellerBreakdown(price: number, kind: ItemKind = "tenis"): PayoutBreakdown {
  const p = price > 0 ? Math.round(price) : 0;
  if (kind === "tenis") {
    const c = siteConfig.commission.tenis;
    const commission = Math.min(p, c.fixed);
    const shipping = Math.min(p - commission, c.shipping);
    return { price: p, commission, shipping, receives: Math.max(0, p - commission - shipping), commissionLabel: "Comisión de Pitsneakers" };
  }
  const c = siteConfig.commission.ropa;
  const commission = Math.round((p * c.percent) / 100);
  const shipping = Math.min(p - commission, c.shipping);
  return { price: p, commission, shipping, receives: Math.max(0, p - commission - shipping), commissionLabel: `Comisión de Pitsneakers (${c.percent}%)` };
}

const money = (v: number) => `$${v.toLocaleString("es-CO")}`;

/** Regla de cobro en una frase, según el tipo de artículo. */
export function commissionRule(kind: ItemKind): string {
  if (kind === "tenis") {
    const c = siteConfig.commission.tenis;
    return `Pares: comisión de ${money(c.fixed)} fijos y envío aprox. ${money(c.shipping)} (se descuentan de lo que recibes).`;
  }
  const c = siteConfig.commission.ropa;
  return `${kind === "ropa" ? "Ropa" : "Accesorios"}: comisión del ${c.percent}% del precio.`;
}

/** Precio al que hay que vender para recibir (después de comisión y envío) un monto dado. Sirve para sugerir precios que ya cubran la comisión. */
export function priceForReceives(target: number, kind: ItemKind = "tenis"): number {
  if (!(target > 0)) return 0;
  if (kind === "tenis") {
    const c = siteConfig.commission.tenis;
    return Math.round(target + c.fixed + c.shipping);
  }
  const c = siteConfig.commission.ropa;
  return Math.round((target + c.shipping) / (1 - c.percent / 100));
}
