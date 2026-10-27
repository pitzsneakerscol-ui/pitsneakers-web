import "server-only";
import assignmentsJson from "@/data/assignments.json";
import { getDb } from "@/lib/db";
import { listResellers } from "@/lib/admin";
import { getSyncPlan, type SyncPair } from "@/lib/seller-sync";
import type { SellerAssignment } from "@/lib/sheet-source";

export interface NewsItem {
  /** true = el modelo está enlazado al catálogo (aunque esta talla o unidad todavía no se publique). */
  linked: boolean;
  name: string;
  brand: string;
  size: string;
  status: string;
  createdAt: number;
}

export interface StockNewsRow {
  userId: number;
  name: string;
  username: string;
  whatsapp: string;
  /** Última vez que cargó un par en su inventario (null si nunca). */
  lastUpdate: number | null;
  /** Pares que cargó en el periodo (la novedad). */
  recent: NewsItem[];
  /** Pares del catálogo asignados a esta persona que todavía no están en su inventario. */
  pendingLoad: SyncPair[];
  /** Pares en su inventario (en stock o reservados) que no tienen publicación propia en el catálogo: ni el modelo ni esa talla están asignados a él. */
  unpublished: NewsItem[];
  /** Pares activos en su inventario. */
  active: number;
}

const DAY = 86_400_000;

const assignments = assignmentsJson as SellerAssignment[];
const loose = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9@]+/g, "");
const normSize = (v: string) => v.trim().toLowerCase().replace(",", ".");

/** Unidades que el catálogo ya tiene publicadas para cada vendedor: "vendedor|modelo|talla" -> cantidad. */
function publishedUnits(): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of assignments) {
    for (const size of a.sizes.length ? [...new Set(a.sizes)] : [""]) {
      const key = `${loose(a.seller)}|${a.slug}|${normSize(size)}`;
      out.set(key, (out.get(key) ?? 0) + (a.counts?.[size] ?? 1));
    }
  }
  return out;
}

/**
 * Novedades de inventario por revendedor: qué cargó en los últimos `days` días, qué le falta cargar de lo que tiene asignado en el catálogo
 * y qué tiene en su inventario que todavía no se publica en el catálogo. Los que más reciente actualizaron salen primero.
 */
export async function getStockNews(days: number, now: number): Promise<StockNewsRow[]> {
  const since = now - days * DAY;
  const db = await getDb();
  const [resellers, plan, itemsRes, lastRes] = await Promise.all([
    listResellers(),
    getSyncPlan(),
    db.execute({
      sql: `SELECT i.user_id, i.name, i.brand, i.size, i.status, i.catalog_slug, i.created_at
            FROM items i JOIN users u ON u.id = i.user_id
            WHERE u.role != 'admin' AND (i.status != 'vendido' OR i.created_at >= ?)
            ORDER BY i.created_at DESC, i.id DESC LIMIT 5000`,
      args: [since],
    }),
    db.execute("SELECT user_id, MAX(created_at) AS last FROM items GROUP BY user_id"),
  ]);

  const last = new Map(lastRes.rows.map((r) => [Number(r.user_id), r.last === null ? null : Number(r.last)]));
  const pendingByUser = new Map<number, SyncPair[]>();
  for (const p of plan) if (p.userId !== null) pendingByUser.set(p.userId, [...(pendingByUser.get(p.userId) ?? []), ...p.pending]);

  const rows = new Map<number, StockNewsRow>(
    resellers.map((r) => [
      r.id,
      {
        userId: r.id,
        name: r.displayName || r.username,
        username: r.username,
        whatsapp: r.whatsapp,
        lastUpdate: last.get(r.id) ?? null,
        recent: [],
        pendingLoad: pendingByUser.get(r.id) ?? [],
        unpublished: [],
        active: 0,
      },
    ])
  );

  // Lo que el catálogo ya publica a nombre de cada revendedor (el vendedor del catálogo puede ser su usuario o su correo).
  const published = publishedUnits();
  const keysByUser = new Map(resellers.map((r) => [r.id, [r.username, r.email, r.displayName].filter(Boolean).map(loose)]));
  const avail = new Map<number, Map<string, number>>();
  const availFor = (userId: number): Map<string, number> => {
    let m = avail.get(userId);
    if (!m) {
      m = new Map();
      for (const key of keysByUser.get(userId) ?? []) {
        for (const [k, n] of published) {
          if (k.startsWith(`${key}|`)) m.set(k.slice(key.length + 1), Math.max(m.get(k.slice(key.length + 1)) ?? 0, n));
        }
      }
      avail.set(userId, m);
    }
    return m;
  };

  for (const x of itemsRes.rows) {
    const userId = Number(x.user_id);
    const row = rows.get(userId);
    if (!row) continue;
    const slug = String(x.catalog_slug);
    const it: NewsItem = { linked: slug !== "", name: String(x.name), brand: String(x.brand), size: String(x.size), status: String(x.status), createdAt: Number(x.created_at) };
    if (it.createdAt >= since) row.recent.push(it);
    if (it.status !== "vendido") {
      row.active++;
      // Publicado = el catálogo tiene este modelo y esta talla a nombre del revendedor (una unidad por cada una publicada).
      const left = slug ? (availFor(userId).get(`${slug}|${normSize(it.size)}`) ?? 0) : 0;
      if (left > 0) availFor(userId).set(`${slug}|${normSize(it.size)}`, left - 1);
      else row.unpublished.push(it);
    }
  }

  return [...rows.values()].sort(
    (a, b) => b.recent.length - a.recent.length || (b.lastUpdate ?? 0) - (a.lastUpdate ?? 0) || a.name.localeCompare(b.name)
  );
}
