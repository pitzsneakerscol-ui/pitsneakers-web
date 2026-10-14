import "server-only";
import { cache } from "react";
import assignmentsJson from "@/data/assignments.json";
import { getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { insertItems } from "@/lib/reseller";
import { todayBogota } from "@/lib/reseller-shared";
import type { SellerAssignment } from "@/lib/sheet-source";

const assignments = assignmentsJson as SellerAssignment[];

export interface SyncPair {
  name: string;
  size: string;
}

export interface SyncRow {
  /** usuario del vendedor tal como está en la columna VENDEDOR del CSV */
  seller: string;
  /** si ya existe la cuenta */
  userId: number | null;
  displayName: string;
  /** pares que faltan cargar en su inventario (uno por unidad) */
  pending: SyncPair[];
  /** pares que ya tiene cargados */
  loaded: number;
}

/** Cuántas unidades de cada par/talla tiene ya cargadas el vendedor (cualquier estado, incluido "vendido", para no volver a cargar lo que ya vendió). */
async function haveCounts(userId: number): Promise<Map<string, number>> {
  const db = await getDb();
  const items = await db.execute({
    sql: "SELECT catalog_slug, size, COUNT(*) AS n FROM items WHERE user_id = ? AND catalog_slug != '' GROUP BY catalog_slug, size",
    args: [userId],
  });
  return new Map(items.rows.map((r) => [`${String(r.catalog_slug)}|${String(r.size)}`, Number(r.n)]));
}

/** Tallas que faltan de un par: una entrada por unidad (un par con cantidad 3 en la talla 9 puede devolver "9" tres veces). */
function missingSizes(a: SellerAssignment, have: Map<string, number>): string[] {
  const out: string[] = [];
  for (const size of a.sizes.length ? [...new Set(a.sizes)] : [""]) {
    const wanted = a.counts?.[size] ?? 1;
    const already = have.get(`${a.slug}|${size}`) ?? 0;
    for (let i = already; i < wanted; i++) out.push(size);
  }
  return out;
}

/** Qué le falta a cada vendedor: compara los pares con VENDEDOR del catálogo contra lo que ya está en su inventario. */
export async function getSyncPlan(): Promise<SyncRow[]> {
  if (assignments.length === 0) return [];
  const db = await getDb();
  const bySeller = new Map<string, SellerAssignment[]>();
  for (const a of assignments) bySeller.set(a.seller, [...(bySeller.get(a.seller) ?? []), a]);

  const rows: SyncRow[] = [];
  for (const [seller, list] of bySeller) {
    const u = await db.execute({
      sql: "SELECT id, display_name FROM users WHERE username = ? AND role != 'admin'",
      args: [seller],
    });
    const userId = u.rows[0] ? Number(u.rows[0].id) : null;
    const have = userId !== null ? await haveCounts(userId) : new Map<string, number>();
    const pending: SyncPair[] = [];
    let loaded = 0;
    for (const a of list) {
      const missing = missingSizes(a, have);
      for (const size of missing) pending.push({ name: a.name, size });
      const wanted = (a.sizes.length ? [...new Set(a.sizes)] : [""]).reduce((s, size) => s + (a.counts?.[size] ?? 1), 0);
      loaded += wanted - missing.length;
    }
    rows.push({ seller, userId, displayName: u.rows[0] ? String(u.rows[0].display_name || seller) : "", pending, loaded });
  }
  return rows.sort((x, y) => y.pending.length - x.pending.length || x.seller.localeCompare(y.seller));
}

export interface SyncNotice {
  userId: number;
  username: string;
  items: { name: string; size: string; price: number }[];
}

/** Carga en la cuenta de `userId` lo que le falta de sus pares asignados. Devuelve lo cargado. */
async function loadFor(userId: number, seller: string): Promise<{ name: string; size: string; price: number }[]> {
  const mine = assignments.filter((a) => a.seller === seller);
  if (mine.length === 0) return [];
  const have = await haveCounts(userId);
  const today = todayBogota();
  const loaded: { name: string; size: string; price: number }[] = [];
  for (const a of mine) {
    const missing = missingSizes(a, have);
    if (missing.length === 0) continue;
    await insertItems(
      userId,
      {
        brand: a.brand,
        name: a.name,
        colorway: a.colorway,
        sku: a.sku,
        condition: a.condition,
        cost: 0,
        extraCost: 0,
        expectedPrice: a.price,
        purchaseDate: today,
        source: "Cargado por Pitsneakers",
        notes: "",
        imageUrl: a.image,
        catalogSlug: a.slug,
      },
      missing
    );
    for (const size of missing) loaded.push({ name: a.name, size, price: a.price });
  }
  return loaded;
}

/** Carga en cada cuenta existente los pares que le faltan. Los vendedores sin cuenta se quedan esperando. */
export async function runSync(): Promise<{ added: number; sellers: number; waiting: string[]; notices: SyncNotice[] }> {
  const plan = await getSyncPlan();
  let added = 0;
  let sellers = 0;
  const waiting: string[] = [];
  const notices: SyncNotice[] = [];
  for (const row of plan) {
    if (row.userId === null) {
      if (row.pending.length) waiting.push(row.seller);
      continue;
    }
    if (!row.pending.length) continue;
    const items = await loadFor(row.userId, row.seller);
    if (!items.length) continue;
    sellers++;
    added += items.length;
    notices.push({ userId: row.userId, username: row.seller, items });
  }
  return { added, sellers, waiting, notices };
}

/**
 * Carga en la cuenta de un vendedor los pares del catálogo que llevan su usuario y todavía no tiene.
 * Se llama sola cuando el vendedor entra a su panel, así que sus pares aparecen sin que el dueño tenga que pulsar nada.
 */
export async function syncUser(userId: number, username: string): Promise<number> {
  const items = await loadFor(userId, username.trim().toLowerCase());
  if (items.length > 0) {
    const names = [...new Set(items.map((i) => i.name))];
    await createNotification(userId, {
      kind: "inventario",
      title: items.length === 1 ? "Se cargó 1 par en tu inventario" : `Se cargaron ${items.length} pares en tu inventario`,
      body: names.slice(0, 3).join(", ") + (names.length > 3 ? ` y ${names.length - 3} más` : ""),
      href: "/revendedores/inventario",
    });
  }
  return items.length;
}

/** Igual que syncUser, pero una sola vez por petición (la comparten el layout y la página) y sin lanzar errores. */
export const ensureSynced = cache(async (userId: number, username: string): Promise<number> => {
  try {
    return await syncUser(userId, username);
  } catch {
    return 0;
  }
});
