// Tipos y reglas de la subasta que también usa el navegador (sin acceso a la base de datos).

/** Si alguien puja en los últimos 2 minutos, ese par se alarga 2 minutos más (evita las pujas "a último segundo"). */
export const SNIPE_MS = 2 * 60 * 1000;
export const MAX_BID = 50_000_000;
/** Cada cuánto se desbloquea un par nuevo: el primero con la apertura y luego uno por hora, en el orden de la lista. */
export const UNLOCK_EVERY_MS = 60 * 60 * 1000;

/** Momento en que se destapa el par que va en la posición `rank` (0 = el primero). */
export const unlockAt = (startsAt: number, rank: number): number => startsAt + rank * UNLOCK_EVERY_MS;

export type ItemStatus = "upcoming" | "open" | "closed";

export interface AuctionInfo {
  id: number;
  title: string;
  startsAt: number;
  endsAt: number;
  published: boolean;
}

export interface AuctionItemView {
  id: number;
  name: string;
  brand: string;
  /** Talla. Vacía mientras el par está en incógnito (el servidor no la manda hasta que se desbloquea). */
  size: string;
  condition: string;
  description: string;
  image: string;
  startPrice: number;
  minIncrement: number;
  currentBid: number;
  bidCount: number;
  endsAt: number;
  /** Correo enmascarado del que va ganando (nunca el correo completo). */
  leader: string;
  isLeader: boolean;
  /** En incógnito: todavía no se desbloquea, así que el servidor no manda nombre, foto ni precio. */
  locked: boolean;
  /** Cuándo se desbloquea. */
  opensAt: number;
  /** El último de la lista (el gran final). */
  finale: boolean;
}

/** Estado en vivo de un par (lo que se actualiza cada pocos segundos). */
export type LiveItem = Pick<AuctionItemView, "id" | "currentBid" | "bidCount" | "endsAt" | "leader" | "isLeader">;

export const minNextBid = (i: Pick<AuctionItemView, "bidCount" | "currentBid" | "startPrice" | "minIncrement">): number =>
  i.bidCount > 0 ? i.currentBid + i.minIncrement : i.startPrice;

export function itemStatus(startsAt: number, endsAt: number, now: number): ItemStatus {
  if (now < startsAt) return "upcoming";
  return now < endsAt ? "open" : "closed";
}

/** "pr***@gm***.com" → solo se ve una pista del correo. */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${user.slice(0, 2)}***@${host.slice(0, 2)}***${tld}`;
}

const BOGOTA = "America/Bogota";

export function formatWhen(ms: number): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: BOGOTA, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(ms));
}

/** Valor para <input type="datetime-local"> en hora de Colombia. */
export function toLocalInput(ms: number): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: BOGOTA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** "2026-11-05T19:30" (hora de Colombia, UTC-5 sin horario de verano) → milisegundos. */
export function fromLocalInput(v: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const t = Date.parse(`${v}:00-05:00`);
  return Number.isNaN(t) ? null : t;
}
