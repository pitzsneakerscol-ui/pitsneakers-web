import "server-only";
import { getDb, isDbConfigured } from "@/lib/db";

export interface RecentPurchase {
  /** solo el nombre de pila: nunca apellido, correo, celular ni ciudad */
  name: string;
  product: string;
  brand: string;
  image: string;
  size: string;
  /** cuándo se pagó (ms) */
  at: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** "DIEGO ARMANDO" -> "Diego". Devuelve "" si no hay un nombre de pila usable. */
function firstName(full: string): string {
  const w = full.trim().split(/\s+/)[0] ?? "";
  if (w.length < 2 || !/^\p{L}+$/u.test(w)) return "";
  return w.charAt(0).toLocaleUpperCase("es") + w.slice(1).toLocaleLowerCase("es");
}

/** /products/NOMBRE.ext -> /products/t/NOMBRE.webp (miniatura liviana, ver scripts/miniaturas.mjs). */
function thumbOf(src: string): string {
  const m = /^\/products\/([^/]+)\.(?:webp|png|jpe?g)$/i.exec(src);
  return m ? `/products/t/${m[1]}.webp` : src;
}

/**
 * Últimas compras reales para mostrar como prueba social. Solo cuenta pedidos pagados que el equipo ya despachó o entregó
 * (así nunca aparece un pedido de prueba, rechazado o con incidencia) de los últimos 30 días.
 */
export async function listRecentPurchases(limit = 6): Promise<RecentPurchase[]> {
  if (!isDbConfigured()) return [];
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT buyer_name, product_name, brand, size, image, paid_at FROM catalog_orders
          WHERE status = 'pagado' AND fulfillment IN ('despachado','entregado') AND paid_at IS NOT NULL AND paid_at > ?
          ORDER BY paid_at DESC LIMIT ?`,
    args: [Date.now() - 30 * DAY, limit * 3],
  });
  const out: RecentPurchase[] = [];
  for (const row of r.rows) {
    const name = firstName(String(row.buyer_name));
    const product = String(row.product_name).trim();
    if (!name || !product) continue;
    out.push({ name, product, brand: String(row.brand), size: String(row.size), image: thumbOf(String(row.image)), at: Number(row.paid_at) });
    if (out.length >= limit) break;
  }
  return out;
}
