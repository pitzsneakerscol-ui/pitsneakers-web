import { siteConfig } from "@/config/site";

/** El sale está activo si está encendido y, cuando tiene fecha de cierre, esa fecha no ha pasado. */
export function promoLive(): boolean {
  const { enabled, endsAt } = siteConfig.promo;
  if (!enabled) return false;
  return !endsAt || new Date(endsAt).getTime() > Date.now();
}
