export type ItemStatus = "stock" | "reservado" | "vendido";
export type ItemCondition = "nuevo" | "usado";
/** Qué clase de artículo es: tenis, ropa o accesorio (gorras, morrales, cinturones…). */
export type ItemKind = "tenis" | "ropa" | "accesorio";
export const KIND_LABEL: Record<ItemKind, string> = { tenis: "Tenis", ropa: "Ropa", accesorio: "Accesorio" };
export const parseKind = (v: unknown): ItemKind => (v === "ropa" || v === "accesorio" ? v : "tenis");

const KIND_NOUN: Record<ItemKind, [string, string]> = { tenis: ["par", "pares"], ropa: ["prenda", "prendas"], accesorio: ["accesorio", "accesorios"] };
const KIND_ORDER: ItemKind[] = ["tenis", "ropa", "accesorio"];
const KIND_HEADING: Record<ItemKind, string> = { tenis: "Tenis", ropa: "Ropa", accesorio: "Accesorios" };

/** "1 par", "3 prendas", "2 pares y 3 prendas" (lo que se cargó, separado por tipo). */
export function kindsPhrase(items: { kind?: ItemKind }[]): string {
  const count = new Map<ItemKind, number>();
  for (const i of items) count.set(i.kind ?? "tenis", (count.get(i.kind ?? "tenis") ?? 0) + 1);
  const parts = KIND_ORDER.filter((k) => count.has(k)).map((k) => {
    const n = count.get(k)!;
    return `${n} ${KIND_NOUN[k][n === 1 ? 0 : 1]}`;
  });
  return parts.length <= 1 ? parts[0] ?? "0 pares" : `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

/** Tipos presentes, en orden fijo (tenis, ropa, accesorio). */
export const kindsIn = (items: { kind?: ItemKind }[]): ItemKind[] => KIND_ORDER.filter((k) => items.some((i) => (i.kind ?? "tenis") === k));
export const kindHeading = (k: ItemKind): string => KIND_HEADING[k];
/** Sustantivo en singular ("par", "prenda", "accesorio"). */
export const kindNoun = (k: ItemKind): string => KIND_NOUN[k][0];

export interface Item {
  id: number;
  brand: string;
  name: string;
  colorway: string;
  sku: string;
  size: string;
  condition: ItemCondition;
  kind: ItemKind;
  cost: number;
  extraCost: number;
  expectedPrice: number;
  status: ItemStatus;
  purchaseDate: string;
  source: string;
  notes: string;
  imageUrl: string;
  catalogSlug: string;
  soldPrice: number | null;
  soldDate: string | null;
  soldChannel: string;
  saleFees: number;
  buyer: string;
  createdAt: number;
}

export const SALE_CHANNELS = [
  "WhatsApp",
  "Instagram",
  "Mercado Libre",
  "Presencial",
  "Consignación",
  "Otro",
] as const;

export const STALE_DAYS = 60;

/** Fecha de hoy (YYYY-MM-DD) en hora de Colombia. */
export function todayBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function daysBetween(from: string, to: string): number {
  if (!isValidDate(from) || !isValidDate(to)) return 0;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export const itemTotalCost = (i: Pick<Item, "cost" | "extraCost">) =>
  i.cost + i.extraCost;

/** Utilidad esperada si se vende al precio esperado (null si no hay precio). */
export function expectedProfit(i: Item): number | null {
  if (i.expectedPrice <= 0) return null;
  return i.expectedPrice - itemTotalCost(i);
}

/** Utilidad real de un par vendido. */
export function realizedProfit(i: Item): number | null {
  if (i.status !== "vendido" || i.soldPrice === null) return null;
  return i.soldPrice - itemTotalCost(i) - i.saleFees;
}

export function daysInStock(i: Item, today: string): number {
  if (!i.purchaseDate) return 0;
  const end = i.status === "vendido" && i.soldDate ? i.soldDate : today;
  return daysBetween(i.purchaseDate, end);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function itemLabel(i: Pick<Item, "brand" | "name" | "colorway">): string {
  return [i.name, i.colorway].filter(Boolean).join(" ");
}

export const isEmail = (v: string) =>
  /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(v) && v.length <= 120;

export type ActionState =
  | { ok?: boolean; error?: string; message?: string; wa?: string }
  | undefined;
