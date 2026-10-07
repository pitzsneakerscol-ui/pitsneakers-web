export type ItemStatus = "stock" | "reservado" | "vendido";
export type ItemCondition = "nuevo" | "usado";

export interface Item {
  id: number;
  brand: string;
  name: string;
  colorway: string;
  sku: string;
  size: string;
  condition: ItemCondition;
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
  | { ok?: boolean; error?: string; message?: string }
  | undefined;
