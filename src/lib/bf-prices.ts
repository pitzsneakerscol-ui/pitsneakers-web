import "server-only";
import { getDb } from "@/lib/db";
import { resetLiveOverlay, loadLiveOverlay } from "@/lib/catalog-live";
import { getRegularProducts } from "@/lib/products";
import { sellerSkus } from "@/lib/seller-sync";
import { sellerBreakdown } from "@/lib/payout";
import type { ItemKind } from "@/lib/reseller-shared";

export interface BfPair {
  sku: string;
  name: string;
  brand: string;
  image: string;
  sizes: string[];
  /** Precio normal de hoy. */
  price: number;
  /** Lo que ya puso para Black Friday (0 = no participa). */
  bfPrice: number;
  kind: ItemKind;
}

const kindOf = (category: string, subcategory?: string): ItemKind => (category === "sneakers" ? "tenis" : subcategory === "accesorio" ? "accesorio" : "ropa");

/** Los pares del catálogo que son de este vendedor, con el precio que puso para Black Friday (si puso alguno). */
export async function listBfPairs(userId: number, username: string): Promise<BfPair[]> {
  const mine = new Set(await sellerSkus(userId, username));
  if (mine.size === 0) return [];
  const [products, overlay] = await Promise.all([getRegularProducts(), loadLiveOverlay()]);
  return products
    .filter((p) => mine.has(p.id) && p.price > 0)
    .map((p) => ({
      sku: p.id,
      name: p.name,
      brand: p.brand,
      image: p.images[0] ?? "",
      sizes: p.sizes,
      price: p.price,
      bfPrice: overlay.bf.get(p.id) ?? 0,
      kind: kindOf(p.category, p.subcategory),
    }));
}

export type BfSaveResult = { ok: true; set: number; cleared: number } | { ok: false; error: string };

/**
 * Guarda los precios de Black Friday de un vendedor. `wanted`: SKU → precio (0 o vacío = quitar). Solo acepta pares que son suyos
 * y precios menores al normal. Quien lo llama ya verificó la sesión.
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
    set++;
    writes.push({
      sql: "INSERT INTO bf_prices (sku, user_id, price, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(sku) DO UPDATE SET price = excluded.price, user_id = excluded.user_id, updated_at = excluded.updated_at",
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
