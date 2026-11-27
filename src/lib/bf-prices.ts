import "server-only";
import { getDb } from "@/lib/db";
import { resetLiveOverlay } from "@/lib/catalog-live";
import { getRegularProducts } from "@/lib/products";
import { sellerSkus } from "@/lib/seller-sync";
import { sellerBreakdown } from "@/lib/payout";
import type { ItemKind } from "@/lib/reseller-shared";

/** pendiente = el revendedor lo propuso y el dueño no lo ha revisado · aprobado = sale en la página · rechazado = no entra. */
export type BfStatus = "pendiente" | "aprobado" | "rechazado";

export interface BfPair {
  sku: string;
  name: string;
  brand: string;
  image: string;
  sizes: string[];
  /** Precio normal de hoy. */
  price: number;
  /** Lo que ya propuso para Black Friday (0 = no participa). */
  bfPrice: number;
  /** Estado de esa propuesta ("" si no propuso nada). */
  status: BfStatus | "";
  /** Motivo si el dueño la rechazó. */
  note: string;
  kind: ItemKind;
}

const kindOf = (category: string, subcategory?: string): ItemKind => (category === "sneakers" ? "tenis" : subcategory === "accesorio" ? "accesorio" : "ropa");
const asStatus = (v: unknown): BfStatus => (v === "aprobado" || v === "rechazado" ? v : "pendiente");

/**
 * Los pares del catálogo que son de este vendedor, con el precio que propuso para Black Friday (si propuso alguno) y su estado.
 * Son suyos los que llevan su usuario en el archivo del catálogo y los que cargó él mismo en su panel y ya salen en la página
 * (los que publica "Actualizar catálogo").
 */
export async function listBfPairs(userId: number, username: string): Promise<BfPair[]> {
  const db = await getDb();
  const [assigned, live] = await Promise.all([
    sellerSkus(userId, username),
    db.execute({ sql: "SELECT id FROM live_listings WHERE seller_id = ?", args: [userId] }),
  ]);
  const mine = new Set([...assigned, ...live.rows.map((r) => String(r.id))]);
  if (mine.size === 0) return [];
  const [products, rows] = await Promise.all([
    getRegularProducts(),
    db.execute({ sql: "SELECT sku, price, status, note FROM bf_prices WHERE user_id = ?", args: [userId] }),
  ]);
  const prop = new Map(rows.rows.map((r) => [String(r.sku), { price: Number(r.price), status: asStatus(r.status), note: String(r.note ?? "") }]));
  return products
    .filter((p) => mine.has(p.id) && p.price > 0)
    .map((p) => {
      const b = prop.get(p.id);
      return {
        sku: p.id,
        name: p.name,
        brand: p.brand,
        image: p.images[0] ?? "",
        sizes: p.sizes,
        price: p.price,
        bfPrice: b?.price ?? 0,
        status: b ? b.status : "",
        note: b?.note ?? "",
        kind: kindOf(p.category, p.subcategory),
      };
    });
}

export type BfSaveResult = { ok: true; set: number; cleared: number } | { ok: false; error: string };

/**
 * Guarda las propuestas de Black Friday de un vendedor. `wanted`: SKU → precio (0 o vacío = quitar). Solo acepta pares que son suyos
 * y precios menores al normal. Toda propuesta nueva o cambiada queda "pendiente" hasta que el dueño la apruebe; si el precio no cambió,
 * conserva su estado. Quien lo llama ya verificó la sesión.
 */
export async function saveBfPrices(userId: number, username: string, wanted: Map<string, number>): Promise<BfSaveResult> {
  const pairs = await listBfPairs(userId, username);
  const byKey = new Map(pairs.map((p) => [p.sku, p]));
  const writes: { sql: string; args: (string | number)[] }[] = [];
  let set = 0;
  let cleared = 0;
  const now = Date.now();
  for (const [sku, price] of wanted) {
    const pair = byKey.get(sku);
    if (!pair) return { ok: false, error: "Uno de los pares no es tuyo." };
    if (!price) {
      if (pair.bfPrice) cleared++;
      writes.push({ sql: "DELETE FROM bf_prices WHERE sku = ? AND user_id = ?", args: [sku, userId] });
      continue;
    }
    if (!Number.isInteger(price) || price <= 0) return { ok: false, error: `El precio de ${pair.name} no es válido.` };
    if (price >= pair.price) return { ok: false, error: `El precio de Black Friday de ${pair.name} tiene que ser menor a su precio normal.` };
    if (sellerBreakdown(price, pair.kind).receives <= 0) return { ok: false, error: `Con ese precio en ${pair.name} no te quedaría nada después de la comisión.` };
    if (price === pair.bfPrice && pair.status) continue; // sin cambios: conserva su estado
    set++;
    writes.push({
      sql: "INSERT INTO bf_prices (sku, user_id, price, updated_at, status, note) VALUES (?, ?, ?, ?, 'pendiente', '') ON CONFLICT(sku) DO UPDATE SET price = excluded.price, user_id = excluded.user_id, updated_at = excluded.updated_at, status = 'pendiente', note = ''",
      args: [sku, userId, price, now],
    });
  }
  if (writes.length > 0) {
    const db = await getDb();
    await db.batch(writes, "write");
    resetLiveOverlay();
  }
  return { ok: true, set, cleared };
}

/* ---------- Lado del dueño ---------- */

export interface BfProposal {
  sku: string;
  userId: number;
  sellerName: string;
  username: string;
  name: string;
  brand: string;
  image: string;
  sizes: string[];
  price: number;
  bfPrice: number;
  /** Descuento en % sobre el precio normal. */
  pct: number;
  status: BfStatus;
  note: string;
  updatedAt: number;
}

/** Todas las propuestas de Black Friday de los revendedores, con el par del catálogo (las que ya no están publicadas se omiten). */
export async function listBfProposals(): Promise<BfProposal[]> {
  const db = await getDb();
  const [products, rows] = await Promise.all([
    getRegularProducts(),
    db.execute(
      "SELECT b.sku, b.user_id, b.price, b.status, b.note, b.updated_at, u.username, u.display_name FROM bf_prices b LEFT JOIN users u ON u.id = b.user_id ORDER BY b.updated_at DESC",
    ),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: BfProposal[] = [];
  for (const r of rows.rows) {
    const p = byId.get(String(r.sku));
    if (!p || p.price <= 0) continue;
    const bfPrice = Number(r.price);
    out.push({
      sku: p.id,
      userId: Number(r.user_id),
      sellerName: String(r.display_name || r.username || "Vendedor"),
      username: String(r.username ?? ""),
      name: p.name,
      brand: p.brand,
      image: p.images[0] ?? "",
      sizes: p.sizes,
      price: p.price,
      bfPrice,
      pct: bfPrice > 0 && bfPrice < p.price ? Math.round((1 - bfPrice / p.price) * 100) : 0,
      status: asStatus(r.status),
      note: String(r.note ?? ""),
      updatedAt: Number(r.updated_at),
    });
  }
  return out;
}

/** El dueño aprueba o rechaza propuestas (varias a la vez). Devuelve cuántas cambió y de quién son, para avisarles. */
export async function setBfStatus(skus: string[], status: Exclude<BfStatus, "pendiente">, note = ""): Promise<{ changed: number; byUser: Map<number, number> }> {
  const clean = [...new Set(skus.filter(Boolean))].slice(0, 500);
  if (clean.length === 0) return { changed: 0, byUser: new Map() };
  const db = await getDb();
  const found = await db.execute({ sql: `SELECT sku, user_id FROM bf_prices WHERE sku IN (${clean.map(() => "?").join(",")})`, args: clean });
  const byUser = new Map<number, number>();
  for (const r of found.rows) byUser.set(Number(r.user_id), (byUser.get(Number(r.user_id)) ?? 0) + 1);
  await db.batch(
    found.rows.map((r) => ({
      sql: "UPDATE bf_prices SET status = ?, note = ?, updated_at = ? WHERE sku = ?",
      args: [status, status === "rechazado" ? note.slice(0, 200) : "", Date.now(), String(r.sku)],
    })),
    "write",
  );
  resetLiveOverlay();
  return { changed: found.rows.length, byUser };
}
