/**
 * Ligas de coleccionistas. Cada par tiene una rareza según su valor aproximado y suma puntos; los puntos
 * de toda la colección definen la liga. Para cambiar la dificultad, ajusta los números de aquí.
 */

export type RarityKey = "comun" | "raro" | "epico" | "legendario";

export interface Rarity {
  key: RarityKey;
  label: string;
  /** valor aproximado mínimo (COP) para esta rareza */
  min: number;
  points: number;
  /** colores de la etiqueta (funcionan en modo día y noche) */
  cls: string;
}

// De la más alta a la más baja.
export const RARITIES: Rarity[] = [
  { key: "legendario", label: "Legendario", min: 1_800_000, points: 10, cls: "bg-fuchsia-500/15 text-fuchsia-600 ring-fuchsia-500/40" },
  { key: "epico", label: "Épico", min: 900_000, points: 6, cls: "bg-violet-500/15 text-violet-600 ring-violet-500/40" },
  { key: "raro", label: "Raro", min: 400_000, points: 3, cls: "bg-sky-500/15 text-sky-600 ring-sky-500/40" },
  { key: "comun", label: "Común", min: 0, points: 1, cls: "bg-neutral-500/15 text-neutral-500 ring-neutral-500/30" },
];

export const rarityOf = (value: number): Rarity => RARITIES.find((r) => value >= r.min) ?? RARITIES[RARITIES.length - 1];

/** Los pares que el comprador agrega a mano no los verificamos: suman la mitad. Los comprados en Pitsneakers suman completo. */
export const MANUAL_WEIGHT = 0.5;

export interface League {
  key: "bronce" | "plata" | "oro" | "platino" | "diamante";
  label: string;
  /** puntos mínimos */
  min: number;
  /** color principal y secundario del emblema */
  from: string;
  to: string;
}

export const LEAGUES: League[] = [
  { key: "bronce", label: "Bronce", min: 0, from: "#e0a06a", to: "#8a4b1f" },
  { key: "plata", label: "Plata", min: 6, from: "#f1f4f8", to: "#8e99a8" },
  { key: "oro", label: "Oro", min: 15, from: "#ffe27a", to: "#c98a07" },
  { key: "platino", label: "Platino", min: 30, from: "#b6f3f0", to: "#2fa7b3" },
  { key: "diamante", label: "Diamante", min: 60, from: "#c9ecff", to: "#3b82f6" },
];

export interface LeagueStatus {
  current: League;
  next: League | null;
  points: number;
  /** puntos que faltan para la siguiente liga (0 si ya es la máxima) */
  toNext: number;
  /** avance dentro de la liga actual, 0–100 */
  pct: number;
}

export function leagueFor(points: number): LeagueStatus {
  let idx = 0;
  LEAGUES.forEach((l, i) => {
    if (points >= l.min) idx = i;
  });
  const current = LEAGUES[idx];
  const next = LEAGUES[idx + 1] ?? null;
  if (!next) return { current, next: null, points, toNext: 0, pct: 100 };
  const span = next.min - current.min;
  return { current, next, points, toNext: Math.max(0, next.min - points), pct: Math.max(0, Math.min(100, ((points - current.min) / span) * 100)) };
}

/** Puntos con un decimal como máximo ("12" o "12,5"). */
export const fmtPoints = (p: number): string => (Number.isInteger(p) ? String(p) : p.toFixed(1).replace(".", ","));

/* ---------- Beneficios por liga ---------- */

export interface Perks {
  /** la oferta mínima que se acepta, como % del precio del par */
  minOfferPct: number;
  /** horas para pagar una oferta aceptada */
  payHours: number;
  /** % del costo del pago en línea que cubre Pitsneakers (100 = lo cubrimos todo) */
  feeDiscountPct: number;
  /** sus ofertas salen primero en tu panel, marcadas con estrella */
  priority: boolean;
}

// Los beneficios que cuestan dinero (costo del pago en línea) solo cuentan con puntos de compras verificadas en Pitsneakers.
export const PERKS: Record<League["key"], Perks> = {
  bronce: { minOfferPct: 70, payHours: 24, feeDiscountPct: 0, priority: false },
  plata: { minOfferPct: 70, payHours: 36, feeDiscountPct: 0, priority: false },
  oro: { minOfferPct: 67, payHours: 48, feeDiscountPct: 0, priority: true },
  platino: { minOfferPct: 65, payHours: 72, feeDiscountPct: 50, priority: true },
  diamante: { minOfferPct: 60, payHours: 72, feeDiscountPct: 100, priority: true },
};

/** Costo del pago en línea ya con el descuento de la liga (se redondea hacia arriba a $100). */
export const feeAfterPerk = (fee: number, discountPct: number): number =>
  discountPct <= 0 ? fee : Math.max(0, Math.ceil((fee * (1 - discountPct / 100)) / 100) * 100);

/** Lista legible de lo que da una liga (para mostrarla en la cuenta). */
export function perkLines(key: League["key"]): string[] {
  const p = PERKS[key];
  const lines = [`Ofertas desde el ${p.minOfferPct}% del precio`, `${p.payHours} horas para pagar una oferta aceptada`];
  if (p.priority) lines.push("Tus ofertas se responden primero ⭐");
  if (p.feeDiscountPct >= 100) lines.push("Costo del pago en línea cubierto por nosotros");
  else if (p.feeDiscountPct > 0) lines.push(`${p.feeDiscountPct}% menos en el costo del pago en línea`);
  return lines;
}
