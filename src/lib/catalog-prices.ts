import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { loadLiveOverlay, resetLiveOverlay } from "@/lib/catalog-live";
import { getStaticProducts } from "@/lib/products";
import type { Product, ProductCondition } from "@/types/product";

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

/** El par tal como viene del archivo, del stock del revendedor o de una variante agregada, sin los ajustes manuales encima. */
export async function findBaseProduct(sku: string): Promise<Product | undefined> {
  const [statics, overlay] = await Promise.all([getStaticProducts(), loadLiveOverlay()]);
  return statics.find((p) => p.id === sku) ?? overlay.live.find((p) => p.id === sku) ?? overlay.extras.find((p) => p.id === sku);
}

// Sin 0/O/1/I para que el código se pueda dictar sin confundirse.
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Agrega a una silueta otra opción con sus propias tallas y su propio precio (ej. la 11 a otro precio).
 * Copia los datos del par `fromSku`: al tener la misma marca, nombre y colorway, el catálogo la une sola a esa silueta.
 */
export async function addVariant(fromSku: string, v: { sizes: string[]; price: number; priceBefore: number; condition: ProductCondition }): Promise<{ id: string } | null> {
  const sibling = await findBaseProduct(fromSku);
  if (!sibling) return null;

  const db = await getDb();
  const root = sibling.id.replace(/-X[A-Z0-9]{3,4}$/, "");
  let id = "";
  for (let i = 0; i < 20 && !id; i++) {
    const code = Array.from(randomBytes(3), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
    const candidate = `${root}-X${code}`;
    if (!(await findBaseProduct(candidate))) id = candidate;
  }
  if (!id) return null;

  const priceBefore = v.priceBefore > v.price ? v.priceBefore : undefined;
  const product: Product = {
    ...sibling,
    id,
    sizes: v.sizes,
    price: v.price,
    priceBefore,
    promo: priceBefore !== undefined,
    condition: v.condition,
    // Las fotos ya salen en la silueta (las de los demás pares); la fecha se conserva para no mover la silueta en las listas.
    images: [],
    featured: false,
    isNew: false,
  };
  await db.execute({ sql: "INSERT INTO catalog_extras (id, payload, created_at) VALUES (?, ?, ?)", args: [id, JSON.stringify(product), Date.now()] });
  resetLiveOverlay();
  return { id };
}

/** Borra una variante agregada a mano (y su ajuste, si lo tenía). Solo toca la tabla de variantes agregadas: nunca pares del archivo. */
export async function deleteExtra(sku: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: "DELETE FROM catalog_extras WHERE id = ?", args: [sku] });
  if (r.rowsAffected > 0) await db.execute({ sql: "DELETE FROM catalog_overrides WHERE sku = ?", args: [sku] });
  resetLiveOverlay();
  return r.rowsAffected > 0;
}

export async function clearOverride(sku: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM catalog_overrides WHERE sku = ?", args: [sku] });
  resetLiveOverlay();
}
