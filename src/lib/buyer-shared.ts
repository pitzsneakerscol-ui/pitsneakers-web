/** Solo se vuelve a rutas internas del sitio (evita que un enlace manipulado mande al usuario a otra página). */
export function safeNext(v: string): string {
  return /^\/(?!\/)[\w\-./?=&%]{0,200}$/.test(v) ? v : "/cuenta";
}

import { siteConfig } from "@/config/site";

/** Precio mínimo que se acepta como oferta para un par (el % de siteConfig.offers, redondeado hacia arriba a $1.000). */
export const minOffer = (price: number): number => Math.ceil((price * siteConfig.offers.minPercent) / 100 / 1000) * 1000;
