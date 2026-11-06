import { siteConfig } from "@/config/site";

/** El sale está activo si está encendido y, cuando tiene fecha de cierre, esa fecha no ha pasado. */
function legacyLive(): boolean {
  const { enabled, endsAt } = siteConfig.promo;
  if (!enabled) return false;
  return !endsAt || new Date(endsAt).getTime() > Date.now();
}

export interface PromoInfo {
  /** Id de la campaña, o "sale" para el sale de apertura. */
  id: string;
  /** Nombre corto (menú, avisos). */
  name: string;
  kicker: string;
  title: string;
  subtitle: string;
  /** Vacío = sin fecha de cierre. */
  endsAt: string;
}

export interface UpcomingInfo {
  id: string;
  name: string;
  kicker: string;
  title: string;
  subtitle: string;
  startsAt: string;
}

/** Cuántos días antes de que arranque una campaña se anuncia (cuenta regresiva en la barra y en /sale). */
const TEASER_DAYS = 14;

/** Campaña con fecha que está corriendo ahora mismo, si hay. */
function liveCampaign() {
  const now = Date.now();
  return siteConfig.campaigns.find((c) => new Date(c.startsAt).getTime() <= now && now < new Date(c.endsAt).getTime()) ?? null;
}

/** La promo vigente: una campaña con fecha si hay una corriendo; si no, el sale de apertura (si está encendido). */
export function currentPromo(): PromoInfo | null {
  const c = liveCampaign();
  if (c) return { id: c.id, name: c.name, kicker: c.kicker, title: c.title, subtitle: c.subtitle, endsAt: c.endsAt };
  if (!legacyLive()) return null;
  const p = siteConfig.promo;
  return { id: "sale", name: "Sale", kicker: p.endsAt ? "Oferta por tiempo limitado" : "Rebajas de apertura", title: p.title, subtitle: p.subtitle, endsAt: p.endsAt };
}

/** La próxima campaña, si arranca dentro de los próximos días (y todavía no hay otra corriendo). */
export function upcomingCampaign(): UpcomingInfo | null {
  if (liveCampaign()) return null;
  const now = Date.now();
  const next = siteConfig.campaigns
    .map((c) => ({ c, t: new Date(c.startsAt).getTime() }))
    .filter(({ t }) => t > now && t - now <= TEASER_DAYS * 86400000)
    .sort((a, b) => a.t - b.t)[0];
  if (!next) return null;
  const { id, name, kicker, title, subtitle, startsAt } = next.c;
  return { id, name, kicker, title, subtitle, startsAt };
}

/** Hay una promo corriendo ahora. */
export function promoLive(): boolean {
  return currentPromo() !== null;
}

/** La hora del servidor en ms (para pasarla como fase inicial a componentes de cliente). */
export function nowMs(): number {
  return Date.now();
}

/** ¿Corre ahora una campaña que aplica los precios de Black Friday de los revendedores? */
export function bfPricesLive(): boolean {
  return liveCampaign()?.prices === true;
}
