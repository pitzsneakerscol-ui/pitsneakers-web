import "server-only";
import { getDb } from "@/lib/db";
import { RANK_START, maskName, type RankPeriod, type RankRow } from "@/lib/ranking-shared";

/**
 * Ranking de vendedores por pedidos (pares vendidos). Los puestos se numeran desde RANK_START:
 * el vendedor con más pedidos aparece en el puesto 21, el siguiente en el 22, y así hacia abajo.
 * Los nombres de los demás vendedores salen tapados con x (se enmascaran aquí, en el servidor: el nombre completo nunca llega al navegador);
 * solo el propio vendedor ve el suyo completo. Se ordena por pedidos; en empate gana quien lleva más tiempo en la comunidad.
 */
export async function getLeaderboard(period: RankPeriod, viewerId: number): Promise<RankRow[]> {
  const db = await getDb();
  const month = new Date().toISOString().slice(0, 7);
  const monthOnly = period === "mes";
  const res = await db.execute({
    sql: `SELECT u.id AS id, u.display_name AS display_name, u.username AS username, COUNT(i.id) AS orders
          FROM users u
          LEFT JOIN items i ON i.user_id = u.id AND i.status = 'vendido'${monthOnly ? " AND substr(COALESCE(i.sold_date, ''), 1, 7) = ?" : ""}
          GROUP BY u.id
          ORDER BY orders DESC, u.created_at ASC`,
    args: monthOnly ? [month] : [],
  });
  return res.rows.map((r, i) => ({
    userId: Number(r.id),
    name: Number(r.id) === viewerId ? String(r.display_name || r.username) : maskName(String(r.display_name || r.username)),
    orders: Number(r.orders),
    rank: RANK_START + i,
  }));
}
