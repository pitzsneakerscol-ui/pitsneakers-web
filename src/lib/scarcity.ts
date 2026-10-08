import { ProductGroup } from "@/types/product";

export interface Scarcity {
  text: string;
  /** "last": una sola unidad · "low": pocas tallas · "rare": pieza de alto valor */
  level: "last" | "low" | "rare";
}

const PREMIUM_PRICE = 1_500_000;

/** Aviso de escasez calculado con el inventario real: cada talla publicada es un par. Solo para sneakers. */
export function groupScarcity(group: ProductGroup): Scarcity | null {
  if (group.category !== "sneakers") return null;
  const pares = group.variants.flatMap((v) => (v.sizes.length ? v.sizes.map((s) => ({ s, price: v.price })) : [{ s: "", price: v.price }]));
  if (pares.length === 0) return null;
  if (pares.length === 1) {
    return { level: "last", text: pares[0].s ? `Última unidad · talla ${pares[0].s}` : "Última unidad" };
  }
  if (pares.length <= 3) return { level: "low", text: `Quedan solo ${pares.length} pares` };
  if (Math.min(...pares.map((p) => p.price)) >= PREMIUM_PRICE) return { level: "rare", text: "Pieza premium" };
  return null;
}
