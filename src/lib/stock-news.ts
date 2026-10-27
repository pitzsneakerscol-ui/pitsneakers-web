import "server-only";
import { getDb } from "@/lib/db";
import { listResellers } from "@/lib/admin";
import { getSyncPlan, type SyncPair } from "@/lib/seller-sync";

export interface NewsItem {
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
  /** Pares en su inventario (en stock o reservados) que no están enlazados al catálogo público: faltan por publicar. */
  unpublished: NewsItem[];
  /** Pares activos en su inventario. */
  active: number;
}

const DAY = 86_400_000;

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

  for (const x of itemsRes.rows) {
    const row = rows.get(Number(x.user_id));
    if (!row) continue;
    const it: NewsItem = { name: String(x.name), brand: String(x.brand), size: String(x.size), status: String(x.status), createdAt: Number(x.created_at) };
    if (it.createdAt >= since) row.recent.push(it);
    if (it.status !== "vendido") {
      row.active++;
      if (!String(x.catalog_slug)) row.unpublished.push(it);
    }
  }

  return [...rows.values()].sort(
    (a, b) => b.recent.length - a.recent.length || (b.lastUpdate ?? 0) - (a.lastUpdate ?? 0) || a.name.localeCompare(b.name)
  );
}
