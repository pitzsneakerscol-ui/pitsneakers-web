import "server-only";
import { getDb } from "@/lib/db";
import { getAllGroups } from "@/lib/products";
import { listManualPairs, type Buyer } from "@/lib/buyers";
import type { Product } from "@/types/product";
import { MANUAL_WEIGHT, leagueFor, rarityOf, type LeagueStatus, type Rarity } from "@/lib/leagues";

export type ValueBasis = "catalogo" | "venta" | "compra";

export interface CollectionItem {
  key: string;
  name: string;
  brand: string;
  size: string;
  image: string;
  /** lo que pagó por el par (sin el costo del pago en línea) */
  paid: number;
  /** valor aproximado hoy */
  value: number;
  basis: ValueBasis;
  date: number;
  /** id del par agregado a mano (se puede quitar); las compras en Pitsneakers no se quitan */
  manualId: number | null;
  /** enlace a la ficha si el modelo sigue publicado */
  slug: string | null;
  /** rareza según su valor aproximado, y los puntos que suma a la liga */
  rarity: Rarity;
  points: number;
}

export interface Collection {
  items: CollectionItem[];
  paid: number;
  value: number;
  points: number;
  league: LeagueStatus;
  /** el par de mayor valor */
  best: CollectionItem | null;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Productos del catálogo que son el mismo modelo: mismo id o mismo nombre; para lo escrito a mano, que contenga todas las palabras. */
function matches(name: string, id: string | null, products: Product[]): Product[] {
  const n = norm(name);
  const byId = id ? products.filter((p) => p.id === id) : [];
  if (byId.length) return byId;
  const exact = products.filter((p) => norm(p.name) === n);
  if (exact.length) return exact;
  const words = n.split(" ").filter(Boolean);
  if (words.length < 2) return [];
  return products.filter((p) => {
    const have = new Set(norm(`${p.brand} ${p.name}`).split(" "));
    return words.every((w) => have.has(w));
  });
}

interface Sale {
  name: string;
  net: number;
  at: number;
}

export async function buildCollection(buyer: Buyer): Promise<Collection> {
  const db = await getDb();
  const [groups, mine, sales, manual] = await Promise.all([
    getAllGroups(),
    // Las compras anteriores solo se enlazan si el correo está verificado: si no, cualquiera vería pedidos ajenos.
    buyer.verified
      ? db.execute({ sql: "SELECT * FROM catalog_orders WHERE buyer_email = ? COLLATE NOCASE AND status = 'pagado' ORDER BY paid_at DESC", args: [buyer.email] })
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    db.execute("SELECT product_name, amount, fee, paid_at FROM catalog_orders WHERE status = 'pagado' ORDER BY paid_at DESC LIMIT 400"),
    listManualPairs(buyer.id),
  ]);
  const products = groups.flatMap((g) => g.variants);
  const slugOf = new Map(groups.flatMap((g) => g.variants.map((v) => [v.id, g.groupSlug] as const)));
  const lastSales: Sale[] = sales.rows.map((r) => ({ name: norm(String(r.product_name)), net: Number(r.amount) - Number(r.fee ?? 0), at: Number(r.paid_at ?? 0) }));

  const estimate = (name: string, id: string | null, size: string, paid: number): { value: number; basis: ValueBasis; image: string; slug: string | null } => {
    const found = matches(name, id, products).filter((p) => p.price > 0);
    if (found.length) {
      const sameSize = found.filter((p) => p.sizes.includes(size));
      const pool = sameSize.length ? sameSize : found;
      const best = pool.reduce((a, b) => (b.price < a.price ? b : a));
      return { value: best.price, basis: "catalogo", image: best.images[0] ?? "", slug: slugOf.get(best.id) ?? null };
    }
    const sale = lastSales.find((s) => s.name === norm(name));
    if (sale && sale.net > 0) return { value: sale.net, basis: "venta", image: "", slug: null };
    return { value: paid, basis: "compra", image: "", slug: null };
  };

  const items: CollectionItem[] = [];
  for (const r of mine.rows) {
    const paid = Math.max(0, Number(r.amount) - Number(r.fee ?? 0));
    const e = estimate(String(r.product_name), String(r.product_id), String(r.size), paid);
    items.push({
      key: `o${r.id}`,
      name: String(r.product_name),
      brand: String(r.brand),
      size: String(r.size) === "Única" ? "" : String(r.size),
      image: String(r.image) || e.image,
      paid,
      value: e.value,
      basis: e.basis,
      date: Number(r.paid_at ?? r.created_at),
      manualId: null,
      slug: e.slug,
      rarity: rarityOf(e.value),
      points: rarityOf(e.value).points,
    });
  }
  for (const m of manual) {
    const e = estimate(m.name, null, m.size, m.paid);
    items.push({ key: `m${m.id}`, name: m.name, brand: m.brand, size: m.size, image: e.image, paid: m.paid, value: e.value, basis: e.basis, date: m.createdAt, manualId: m.id, slug: e.slug, rarity: rarityOf(e.value), points: rarityOf(e.value).points * MANUAL_WEIGHT });
  }
  items.sort((a, b) => b.date - a.date);
  const points = items.reduce((s, i) => s + i.points, 0);
  const best = items.reduce<CollectionItem | null>((a, b) => (!a || b.value > a.value ? b : a), null);
  return { items, paid: items.reduce((s, i) => s + i.paid, 0), value: items.reduce((s, i) => s + i.value, 0), points, league: leagueFor(points), best };
}
