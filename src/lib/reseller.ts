import "server-only";
import type { InValue, Row } from "@libsql/client";
import { getDb } from "@/lib/db";
import {
  STALE_DAYS,
  daysBetween,
  daysInStock,
  expectedProfit,
  isValidDate,
  itemTotalCost,
  realizedProfit,
  type Item,
  type ItemCondition,
  type ItemStatus,
} from "@/lib/reseller-shared";

function rowToItem(r: Row): Item {
  return {
    id: Number(r.id),
    brand: String(r.brand),
    name: String(r.name),
    colorway: String(r.colorway),
    sku: String(r.sku),
    size: String(r.size),
    condition: r.condition === "usado" ? "usado" : "nuevo",
    cost: Number(r.cost),
    extraCost: Number(r.extra_cost),
    expectedPrice: Number(r.expected_price),
    status: (["stock", "reservado", "vendido"].includes(String(r.status))
      ? String(r.status)
      : "stock") as ItemStatus,
    purchaseDate: String(r.purchase_date),
    source: String(r.source),
    notes: String(r.notes),
    imageUrl: String(r.image_url),
    catalogSlug: String(r.catalog_slug),
    soldPrice: r.sold_price === null ? null : Number(r.sold_price),
    soldDate: r.sold_date === null ? null : String(r.sold_date),
    soldChannel: String(r.sold_channel),
    saleFees: Number(r.sale_fees),
    buyer: String(r.buyer),
    createdAt: Number(r.created_at),
  };
}

export async function listItems(userId: number): Promise<Item[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC, id DESC",
    args: [userId],
  });
  return res.rows.map(rowToItem);
}

export interface NewItemData {
  brand: string;
  name: string;
  colorway: string;
  sku: string;
  condition: ItemCondition;
  cost: number;
  extraCost: number;
  expectedPrice: number;
  purchaseDate: string;
  source: string;
  notes: string;
  imageUrl: string;
  catalogSlug: string;
}

export async function insertItems(
  userId: number,
  data: NewItemData,
  sizes: string[]
): Promise<number> {
  if (sizes.length === 0) return 0;
  const db = await getDb();
  const now = Date.now();
  await db.batch(
    sizes.map((size, i) => ({
      sql: `INSERT INTO items
        (user_id, brand, name, colorway, sku, size, condition, cost, extra_cost,
         expected_price, status, purchase_date, source, notes, image_url,
         catalog_slug, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stock', ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        data.brand,
        data.name,
        data.colorway,
        data.sku,
        size,
        data.condition,
        data.cost,
        data.extraCost,
        data.expectedPrice,
        data.purchaseDate,
        data.source,
        data.notes,
        data.imageUrl,
        data.catalogSlug,
        now + i,
      ] as InValue[],
    })),
    "write"
  );
  return sizes.length;
}

export async function updateItem(
  userId: number,
  id: number,
  d: NewItemData & { size: string }
): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: `UPDATE items SET brand=?, name=?, colorway=?, sku=?, size=?, condition=?,
          cost=?, extra_cost=?, expected_price=?, purchase_date=?, source=?,
          notes=?, image_url=?, catalog_slug=?
          WHERE id=? AND user_id=?`,
    args: [
      d.brand,
      d.name,
      d.colorway,
      d.sku,
      d.size,
      d.condition,
      d.cost,
      d.extraCost,
      d.expectedPrice,
      d.purchaseDate,
      d.source,
      d.notes,
      d.imageUrl,
      d.catalogSlug,
      id,
      userId,
    ],
  });
  return res.rowsAffected > 0;
}

export async function sellItem(
  userId: number,
  id: number,
  s: {
    soldPrice: number;
    soldDate: string;
    soldChannel: string;
    saleFees: number;
    buyer: string;
  }
): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: `UPDATE items SET status='vendido', sold_price=?, sold_date=?,
          sold_channel=?, sale_fees=?, buyer=?
          WHERE id=? AND user_id=? AND status != 'vendido'`,
    args: [s.soldPrice, s.soldDate, s.soldChannel, s.saleFees, s.buyer, id, userId],
  });
  return res.rowsAffected > 0;
}

/** Cambia a stock/reservado, o reabre un par vendido (borra los datos de venta). */
export async function setItemStatus(
  userId: number,
  id: number,
  status: "stock" | "reservado"
): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: `UPDATE items SET status=?, sold_price=NULL, sold_date=NULL,
          sold_channel='', sale_fees=0, buyer=''
          WHERE id=? AND user_id=?`,
    args: [status, id, userId],
  });
  return res.rowsAffected > 0;
}

export async function deleteItem(userId: number, id: number): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: "DELETE FROM items WHERE id=? AND user_id=?",
    args: [id, userId],
  });
  return res.rowsAffected > 0;
}

/* ---------- Estadísticas ---------- */

export interface BrandStat {
  brand: string;
  count: number;
  invested: number;
}
export interface MonthStat {
  month: string;
  label: string;
  revenue: number;
  profit: number;
  count: number;
}

export interface Stats {
  stockCount: number;
  reservedCount: number;
  soldCount: number;
  invested: number;
  expectedValue: number;
  expectedProfit: number;
  expectedMargin: number | null;
  unpricedCount: number;
  revenueAll: number;
  profitAll: number;
  roiAll: number | null;
  monthRevenue: number;
  monthProfit: number;
  monthCount: number;
  avgDaysInStock: number | null;
  avgDaysToSell: number | null;
  stale: Item[];
  lossRisk: Item[];
  byBrand: BrandStat[];
  byMonth: MonthStat[];
  recentSales: Item[];
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function computeStats(items: Item[], today: string): Stats {
  const open = items.filter((i) => i.status !== "vendido");
  const sold = items.filter((i) => i.status === "vendido");
  const priced = open.filter((i) => i.expectedPrice > 0);

  const invested = open.reduce((s, i) => s + itemTotalCost(i), 0);
  const expectedValue = priced.reduce((s, i) => s + i.expectedPrice, 0);
  const pricedCost = priced.reduce((s, i) => s + itemTotalCost(i), 0);

  const revenueAll = sold.reduce((s, i) => s + (i.soldPrice ?? 0), 0);
  const profitAll = sold.reduce((s, i) => s + (realizedProfit(i) ?? 0), 0);
  const soldCost = sold.reduce((s, i) => s + itemTotalCost(i) + i.saleFees, 0);

  const thisMonth = today.slice(0, 7);
  const monthSales = sold.filter((i) => (i.soldDate ?? "").startsWith(thisMonth));

  const openAges = open.filter((i) => i.purchaseDate).map((i) => daysInStock(i, today));
  const sellTimes = sold
    .filter((i) => i.purchaseDate && i.soldDate)
    .map((i) => daysBetween(i.purchaseDate, i.soldDate as string));

  const brandMap = new Map<string, BrandStat>();
  for (const i of open) {
    const key = i.brand || "Sin marca";
    const cur = brandMap.get(key) ?? { brand: key, count: 0, invested: 0 };
    cur.count += 1;
    cur.invested += itemTotalCost(i);
    brandMap.set(key, cur);
  }

  const [ty, tm] = thisMonth.split("-").map(Number);
  const byMonth: MonthStat[] = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(Date.UTC(ty, tm - 1 - k, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const ms = sold.filter((i) => (i.soldDate ?? "").startsWith(key));
    byMonth.push({
      month: key,
      label: MONTHS[d.getUTCMonth()],
      revenue: ms.reduce((s, i) => s + (i.soldPrice ?? 0), 0),
      profit: ms.reduce((s, i) => s + (realizedProfit(i) ?? 0), 0),
      count: ms.length,
    });
  }

  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

  return {
    stockCount: open.filter((i) => i.status === "stock").length,
    reservedCount: open.filter((i) => i.status === "reservado").length,
    soldCount: sold.length,
    invested,
    expectedValue,
    expectedProfit: expectedValue - pricedCost,
    expectedMargin: expectedValue > 0 ? ((expectedValue - pricedCost) / expectedValue) * 100 : null,
    unpricedCount: open.length - priced.length,
    revenueAll,
    profitAll,
    roiAll: soldCost > 0 ? (profitAll / soldCost) * 100 : null,
    monthRevenue: monthSales.reduce((s, i) => s + (i.soldPrice ?? 0), 0),
    monthProfit: monthSales.reduce((s, i) => s + (realizedProfit(i) ?? 0), 0),
    monthCount: monthSales.length,
    avgDaysInStock: avg(openAges),
    avgDaysToSell: avg(sellTimes),
    stale: open
      .filter((i) => i.purchaseDate && daysInStock(i, today) >= STALE_DAYS)
      .sort((a, b) => daysInStock(b, today) - daysInStock(a, today))
      .slice(0, 5),
    lossRisk: priced.filter((i) => (expectedProfit(i) ?? 0) < 0).slice(0, 5),
    byBrand: [...brandMap.values()].sort((a, b) => b.invested - a.invested).slice(0, 6),
    byMonth,
    recentSales: [...sold]
      .sort((a, b) => (b.soldDate ?? "").localeCompare(a.soldDate ?? ""))
      .slice(0, 5),
  };
}

/* ---------- CSV ---------- */

function csvCell(v: string | number): string {
  // Evita que Excel ejecute fórmulas si un texto empieza con = + - @
  const risky = typeof v === "string" && ["=", "+", "-", "@"].includes(v.charAt(0));
  const s = risky ? `'${v}` : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADERS = [
  "marca",
  "nombre",
  "colorway",
  "sku",
  "talla",
  "condicion",
  "costo",
  "costo_extra",
  "precio_esperado",
  "fecha_compra",
  "proveedor",
  "notas",
];

export function itemsToCsv(items: Item[]): string {
  const head = [
    ...CSV_HEADERS,
    "estado",
    "precio_venta",
    "fecha_venta",
    "canal_venta",
    "gastos_venta",
    "utilidad_real",
  ];
  const lines = [head.join(",")];
  for (const i of items) {
    lines.push(
      [
        i.brand,
        i.name,
        i.colorway,
        i.sku,
        i.size,
        i.condition,
        i.cost,
        i.extraCost,
        i.expectedPrice,
        i.purchaseDate,
        i.source,
        i.notes,
        i.status,
        i.soldPrice ?? "",
        i.soldDate ?? "",
        i.soldChannel,
        i.status === "vendido" ? i.saleFees : "",
        realizedProfit(i) ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvTemplate(): string {
  return `﻿${CSV_HEADERS.join(",")}\r\nNike,Dunk Low Panda,White/Black,DD1391-100,9,nuevo,380000,15000,520000,2026-10-01,Tienda X,Con caja\r\n`;
}

function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(DIACRITICS, "").replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES: Record<string, string[]> = {
  brand: ["marca", "brand"],
  name: ["nombre", "modelo", "producto", "name", "par", "zapato"],
  colorway: ["colorway", "color"],
  sku: ["sku", "codigo", "codigoestilo", "style", "referencia"],
  size: ["talla", "tallas", "size"],
  condition: ["condicion", "estado", "condition"],
  cost: ["costo", "costopagado", "preciocompra", "preciodecompra", "pagado", "compra", "cost"],
  extraCost: ["costoextra", "extra", "gastos", "envio", "costosextra"],
  expectedPrice: ["precioesperado", "precioventa", "precio", "venta", "esperado", "expected"],
  purchaseDate: ["fechacompra", "fecha", "fechadecompra"],
  source: ["proveedor", "fuente", "compradoen", "source", "tienda"],
  notes: ["notas", "nota", "notes", "observaciones"],
};

export interface ImportResult {
  rows: Array<NewItemData & { size: string }>;
  errors: string[];
}

function moneyFrom(v: string): number {
  const digits = v.replace(/[^\d]/g, "");
  return digits ? Math.min(Number(digits), 1_000_000_000) : 0;
}

function dateFrom(v: string, fallback: string): string {
  const t = v.trim();
  if (isValidDate(t)) return t;
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (isValidDate(iso)) return iso;
  }
  return fallback;
}

export const MAX_IMPORT_ROWS = 500;

export function parseInventoryCsv(text: string, today: string): ImportResult {
  const table = parseDelimited(text);
  const result: ImportResult = { rows: [], errors: [] };
  if (table.length < 2) {
    result.errors.push("El archivo está vacío o solo tiene encabezados.");
    return result;
  }
  const heads = table[0].map(norm);
  const col: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = heads.findIndex((h) => aliases.includes(h));
    if (idx >= 0) col[key] = idx;
  }
  if (col.name === undefined) {
    result.errors.push("No encontré la columna 'nombre' (o 'modelo'). Usa la plantilla.");
    return result;
  }
  const get = (r: string[], k: string) => (col[k] === undefined ? "" : (r[col[k]] ?? "").trim());

  for (let n = 1; n < table.length; n++) {
    if (result.rows.length >= MAX_IMPORT_ROWS) {
      result.errors.push(`Solo se importan las primeras ${MAX_IMPORT_ROWS} filas.`);
      break;
    }
    const r = table[n];
    const name = get(r, "name").slice(0, 120);
    if (!name) {
      result.errors.push(`Fila ${n + 1}: falta el nombre.`);
      continue;
    }
    const cond = norm(get(r, "condition"));
    result.rows.push({
      brand: get(r, "brand").slice(0, 60),
      name,
      colorway: get(r, "colorway").slice(0, 80),
      sku: get(r, "sku").slice(0, 40),
      size: get(r, "size").replace(",", ".").slice(0, 12),
      condition: cond.startsWith("usad") ? "usado" : "nuevo",
      cost: moneyFrom(get(r, "cost")),
      extraCost: moneyFrom(get(r, "extraCost")),
      expectedPrice: moneyFrom(get(r, "expectedPrice")),
      purchaseDate: dateFrom(get(r, "purchaseDate"), today),
      source: get(r, "source").slice(0, 80),
      notes: get(r, "notes").slice(0, 500),
      imageUrl: "",
      catalogSlug: "",
    });
  }
  return result;
}

export async function insertImported(
  userId: number,
  rows: ImportResult["rows"]
): Promise<number> {
  if (rows.length === 0) return 0;
  const db = await getDb();
  const now = Date.now();
  await db.batch(
    rows.map((d, i) => ({
      sql: `INSERT INTO items
        (user_id, brand, name, colorway, sku, size, condition, cost, extra_cost,
         expected_price, status, purchase_date, source, notes, image_url,
         catalog_slug, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stock', ?, ?, ?, '', '', ?)`,
      args: [
        userId,
        d.brand,
        d.name,
        d.colorway,
        d.sku,
        d.size,
        d.condition,
        d.cost,
        d.extraCost,
        d.expectedPrice,
        d.purchaseDate,
        d.source,
        d.notes,
        now + i,
      ] as InValue[],
    })),
    "write"
  );
  return rows.length;
}
