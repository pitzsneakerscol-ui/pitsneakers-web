import "server-only";
import assignmentsJson from "@/data/assignments.json";
import { getDb } from "@/lib/db";
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
  /** pares que faltan cargar en su inventario */
  pending: SyncPair[];
  /** pares que ya tiene cargados */
  loaded: number;
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
    const have = new Set<string>();
    if (userId !== null) {
      // Cuenta cualquier estado (incluido "vendido") para no volver a cargar un par que ya vendió.
      const items = await db.execute({
        sql: "SELECT catalog_slug, size FROM items WHERE user_id = ? AND catalog_slug != ''",
        args: [userId],
      });
      for (const r of items.rows) have.add(`${String(r.catalog_slug)}|${String(r.size)}`);
    }
    const pending: SyncPair[] = [];
    let loaded = 0;
    for (const a of list) {
      const sizes = a.sizes.length ? a.sizes : [""];
      for (const size of sizes) {
        if (have.has(`${a.slug}|${size}`)) loaded++;
        else pending.push({ name: a.name, size });
      }
    }
    rows.push({ seller, userId, displayName: u.rows[0] ? String(u.rows[0].display_name || seller) : "", pending, loaded });
  }
  return rows.sort((x, y) => y.pending.length - x.pending.length || x.seller.localeCompare(y.seller));
}

/** Carga en cada cuenta existente los pares que le faltan. Los vendedores sin cuenta se quedan esperando. */
export async function runSync(): Promise<{ added: number; sellers: number; waiting: string[] }> {
  const plan = await getSyncPlan();
  const today = todayBogota();
  let added = 0;
  let sellers = 0;
  const waiting: string[] = [];
  for (const row of plan) {
    if (row.userId === null) {
      if (row.pending.length) waiting.push(row.seller);
      continue;
    }
    if (!row.pending.length) continue;
    sellers++;
    for (const a of assignments.filter((x) => x.seller === row.seller)) {
      const missing = row.pending.filter((p) => p.name === a.name).map((p) => p.size);
      const sizes = missing.filter((s) => (a.sizes.length ? a.sizes.includes(s) : s === ""));
      if (!sizes.length) continue;
      added += await insertItems(
        row.userId,
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
        sizes
      );
    }
  }
  return { added, sellers, waiting };
}
