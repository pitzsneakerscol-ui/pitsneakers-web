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

/** Una talla escrita a mano: "9,5" → "9.5". Devuelve "" si no es válida (letras, números, punto, barra y guion; hasta 10 caracteres). */
export function cleanSize(v: unknown): string {
  const s = String(v ?? "").trim().replace(/\s+/g, " ").replace(",", ".");
  return s.length > 0 && s.length <= 10 && /^[\p{L}\p{N}./ -]+$/u.test(s) ? s : "";
}

/** Limpia, quita repetidas y ordena: primero las numéricas de menor a mayor y luego las de letras (S, M, L…) en el orden en que vienen. */
export function normalizeSizes(list: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = cleanSize(raw);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  const num = (s: string) => (/^\d/.test(s) ? parseFloat(s) : NaN);
  return [...out.filter((s) => !Number.isNaN(num(s))).sort((a, b) => num(a) - num(b)), ...out.filter((s) => Number.isNaN(num(s)))];
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export interface OverrideInput {
  price: number;
  priceBefore: number;
  hidden: boolean;
  /** undefined = no tocar las tallas que ya tenga el ajuste. */
  sizes?: string[];
}

/**
 * Guarda el ajuste de un par. Si queda igual al original (mismo precio, sin precio anterior, mismas tallas y visible) se borra el
 * ajuste para que el par vuelva a depender del archivo / del stock del revendedor.
 */
export async function saveOverride(sku: string, base: { price: number; priceBefore?: number; sizes: string[] }, next: OverrideInput): Promise<void> {
  const db = await getDb();

  let sizes: string[] | null;
  if (next.sizes === undefined) {
    const cur = await db.execute({ sql: "SELECT sizes FROM catalog_overrides WHERE sku = ?", args: [sku] });
    const raw = cur.rows[0]?.sizes;
    sizes = raw ? (JSON.parse(String(raw)) as string[]) : null;
  } else {
    sizes = sameList(next.sizes, normalizeSizes(base.sizes)) ? null : next.sizes;
  }

  const basePromo = base.priceBefore && base.priceBefore > base.price ? base.priceBefore : 0;
  const same = next.price === base.price && next.priceBefore === basePromo && !next.hidden && sizes === null;
  if (same) {
    await db.execute({ sql: "DELETE FROM catalog_overrides WHERE sku = ?", args: [sku] });
  } else {
    await db.execute({
      sql: `INSERT INTO catalog_overrides (sku, price, price_before, hidden, sizes, updated_at) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(sku) DO UPDATE SET price = excluded.price, price_before = excluded.price_before, hidden = excluded.hidden, sizes = excluded.sizes, updated_at = excluded.updated_at`,
      args: [sku, next.price, next.priceBefore, next.hidden ? 1 : 0, sizes === null ? null : JSON.stringify(sizes), Date.now()],
    });
  }
  resetLiveOverlay();
}

export async function clearOverride(sku: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM catalog_overrides WHERE sku = ?", args: [sku] });
  resetLiveOverlay();
}
