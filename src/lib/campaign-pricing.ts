import type { Product } from "@/types/product";

/**
 * Black Friday: el envío es gratis para todos, y cada par que está en oferta sube `markup` pesos para cubrir ese envío.
 * Sin dependencias del servidor, así se prueba suelto y lo puede usar cualquier parte.
 *
 * Solo sube los pares que de verdad están en oferta (precio "antes" mayor al actual). El precio nunca pasa del precio normal:
 * si el descuento fuera menor al aumento, el par queda a su precio normal y sin etiqueta de oferta.
 * `markup` guarda cuánto se sumó de verdad: sirve para no pagarle ese aumento a un revendedor (lo recibe la casa).
 */
export function applyCampaignMarkup(products: Product[], markup: number): Product[] {
  if (!(markup > 0)) return products;
  return products.map((p) => {
    if (!p.promo || !p.priceBefore || p.priceBefore <= p.price) return p;
    const price = Math.min(p.price + markup, p.priceBefore);
    const added = price - p.price;
    if (price >= p.priceBefore) return { ...p, price, priceBefore: undefined, promo: false, markup: added };
    return { ...p, price, markup: added };
  });
}
