import "server-only";
import { getDb } from "@/lib/db";
import { resetLiveOverlay } from "@/lib/catalog-live";

/** "1.100.000", "$ 1100000" o "1,100,000" → 1100000. Devuelve 0 si no hay un número. */
export function parsePesos(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/\D/g, ""));
  return Number.isSafeInteger(n) ? n : 0;
}

export const MIN_PRICE = 1_000;
export const MAX_PRICE = 99_999_999;

/**
 * Guarda el ajuste de un par. Si queda igual al archivo (mismo precio, sin precio anterior ni oculto) se borra el ajuste
 * para que el par vuelva a depender del archivo / del stock del revendedor.
 */
export async function saveOverride(sku: string, base: { price: number; priceBefore?: number }, next: { price: number; priceBefore: number; hidden: boolean }): Promise<void> {
  const db = await getDb();
  const same = next.price === base.price && next.priceBefore === (base.priceBefore && base.priceBefore > base.price ? base.priceBefore : 0) && !next.hidden;
  if (same) {
    await db.execute({ sql: "DELETE FROM catalog_overrides WHERE sku = ?", args: [sku] });
  } else {
    await db.execute({
      sql: `INSERT INTO catalog_overrides (sku, price, price_before, hidden, updated_at) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(sku) DO UPDATE SET price = excluded.price, price_before = excluded.price_before, hidden = excluded.hidden, updated_at = excluded.updated_at`,
      args: [sku, next.price, next.priceBefore, next.hidden ? 1 : 0, Date.now()],
    });
  }
  resetLiveOverlay();
}

export async function clearOverride(sku: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM catalog_overrides WHERE sku = ?", args: [sku] });
  resetLiveOverlay();
}
