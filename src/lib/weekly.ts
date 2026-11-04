import "server-only";
import { getDb } from "@/lib/db";
import { listOrders } from "@/lib/catalog-orders";
import { isLate, isToShip } from "@/lib/fulfillment-shared";
import { listAllBuyerOffers } from "@/lib/buyer-offers";
import { getAllGroups } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { todayBogota } from "@/lib/reseller-shared";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** Fecha "YYYY-MM-DD" en hora de Colombia. */
const bogotaDate = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
const niceDate = (ms: number) => new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });

export interface Pair {
  count: number;
  amount: number;
}

export interface WeeklyReport {
  from: number;
  to: number;
  webOrders: { now: Pair; before: Pair };
  sellerSales: { now: Pair & { profit: number }; before: Pair };
  collected: { now: number; before: number };
  shipping: { shipped: number; delivered: number; avgHoursToShip: number | null; toShip: number; late: number };
  offers: { received: number; paid: number; acceptedUnpaid: number; expired: number; rejected: number; open: number };
  overdue: Pair;
  community: { newBuyers: number; newReviews: number; avgRating: number | null; pendingReviews: number; pendingQuestions: number };
  catalog: { noPhoto: number };
  idleStock: { total: number; over60: number; oldest: { name: string; size: string; days: number; seller: string }[] };
}

/** Cifras de los últimos 7 días contra los 7 anteriores, listas para armar el correo semanal. */
export async function getWeeklyReport(now = Date.now()): Promise<WeeklyReport> {
  const db = await getDb();
  const since = now - WEEK;
  const prevSince = now - 2 * WEEK;
  const dSince = bogotaDate(since);
  const dPrev = bogotaDate(prevSince);
  const today = todayBogota();
  const one = async (sql: string, args: (string | number)[] = []) => (await db.execute({ sql, args })).rows[0] as unknown as Record<string, unknown>;
  const n = (v: unknown) => Number(v ?? 0);

  const [web, sellerNow, sellerBefore, collectedNow, collectedBefore, shipped, delivered, overdue, buyers, reviews, pendingReviews, pendingQuestions, idleTotal, idleOld, idleRows, orders, offers, groups] = await Promise.all([
    one(
      `SELECT COALESCE(SUM(CASE WHEN paid_at >= ? THEN 1 ELSE 0 END),0) AS n1, COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount ELSE 0 END),0) AS s1,
              COALESCE(SUM(CASE WHEN paid_at >= ? AND paid_at < ? THEN 1 ELSE 0 END),0) AS n0, COALESCE(SUM(CASE WHEN paid_at >= ? AND paid_at < ? THEN amount ELSE 0 END),0) AS s0
       FROM catalog_orders WHERE status = 'pagado'`,
      [since, since, prevSince, since, prevSince, since],
    ),
    one(
      `SELECT COUNT(*) AS n, COALESCE(SUM(COALESCE(i.sold_price,0)),0) AS s, COALESCE(SUM(COALESCE(i.sold_price,0) - i.cost - i.extra_cost - i.sale_fees),0) AS p
       FROM items i JOIN users u ON u.id = i.user_id WHERE u.role != 'admin' AND i.status = 'vendido' AND i.sold_date > ?`,
      [dSince],
    ),
    one(
      `SELECT COUNT(*) AS n, COALESCE(SUM(COALESCE(i.sold_price,0)),0) AS s
       FROM items i JOIN users u ON u.id = i.user_id WHERE u.role != 'admin' AND i.status = 'vendido' AND i.sold_date > ? AND i.sold_date <= ?`,
      [dPrev, dSince],
    ),
    one("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'pagado' AND paid_date > ?", [dSince]),
    one("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'pagado' AND paid_date > ? AND paid_date <= ?", [dPrev, dSince]),
    one("SELECT COUNT(*) AS n, AVG(shipped_at - paid_at) AS avg FROM catalog_orders WHERE status = 'pagado' AND shipped_at >= ? AND paid_at IS NOT NULL", [since]),
    one("SELECT COUNT(*) AS n FROM catalog_orders WHERE status = 'pagado' AND delivered_at >= ?", [since]),
    one("SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'pendiente' AND due_date != '' AND due_date < ?", [today]),
    one("SELECT COUNT(*) AS n FROM buyers WHERE created_at >= ?", [since]),
    one("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE created_at >= ? AND status != 'rejected'", [since]),
    one("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'"),
    one("SELECT COUNT(*) AS n FROM market_questions WHERE status = 'pendiente'").catch(() => ({ n: 0 })),
    one("SELECT COUNT(*) AS n FROM items i JOIN users u ON u.id = i.user_id WHERE u.role != 'admin' AND i.status IN ('stock','reservado')"),
    one("SELECT COUNT(*) AS n FROM items i JOIN users u ON u.id = i.user_id WHERE u.role != 'admin' AND i.status IN ('stock','reservado') AND i.created_at < ?", [now - 60 * DAY]),
    db.execute({
      sql: `SELECT i.brand, i.name, i.size, i.created_at, COALESCE(NULLIF(u.display_name,''), u.username) AS seller
            FROM items i JOIN users u ON u.id = i.user_id
            WHERE u.role != 'admin' AND i.status IN ('stock','reservado') ORDER BY i.created_at ASC LIMIT 5`,
      args: [],
    }),
    listOrders(),
    listAllBuyerOffers("todas"),
    getAllGroups(),
  ]);

  const toShip = orders.filter((o) => o.status === "pagado" && isToShip(o.fulfillment));
  const mine = offers.filter((o) => o.createdAt >= since);
  const count = (s: string) => mine.filter((o) => o.status === s).length;

  return {
    from: since,
    to: now,
    webOrders: { now: { count: n(web.n1), amount: n(web.s1) }, before: { count: n(web.n0), amount: n(web.s0) } },
    sellerSales: { now: { count: n(sellerNow.n), amount: n(sellerNow.s), profit: n(sellerNow.p) }, before: { count: n(sellerBefore.n), amount: n(sellerBefore.s) } },
    collected: { now: n(collectedNow.s), before: n(collectedBefore.s) },
    shipping: {
      shipped: n(shipped.n),
      delivered: n(delivered.n),
      avgHoursToShip: shipped.avg === null || shipped.avg === undefined ? null : Math.round(n(shipped.avg) / 3_600_000),
      toShip: toShip.length,
      late: toShip.filter((o) => isLate(o.fulfillment, o.paidAt, o.createdAt)).length,
    },
    offers: {
      received: mine.length,
      paid: count("pagada"),
      acceptedUnpaid: count("aceptada"),
      expired: count("vencida"),
      rejected: count("rechazada"),
      open: count("pendiente") + count("contraoferta"),
    },
    overdue: { count: n(overdue.n), amount: n(overdue.s) },
    community: {
      newBuyers: n(buyers.n),
      newReviews: n(reviews.n),
      avgRating: reviews.avg === null || reviews.avg === undefined ? null : Math.round(n(reviews.avg) * 10) / 10,
      pendingReviews: n(pendingReviews.n),
      pendingQuestions: n(pendingQuestions.n),
    },
    catalog: { noPhoto: groups.filter((g) => g.images.length === 0).length },
    idleStock: {
      total: n(idleTotal.n),
      over60: n(idleOld.n),
      oldest: idleRows.rows.map((r) => ({
        name: `${String(r.brand)} ${String(r.name)}`.trim().replace(/^(\S+) \1 /, "$1 "),
        size: String(r.size ?? ""),
        days: Math.floor((now - Number(r.created_at)) / DAY),
        seller: String(r.seller ?? ""),
      })),
    },
  };
}

const compare = (now: number, before: number, money = false) => {
  if (now === before) return "igual que la semana anterior";
  const fmt = (v: number) => (money ? formatPrice(v) : String(v));
  return `${now > before ? "▲" : "▼"} antes: ${fmt(before)}`;
};

/** Correo semanal listo para enviar (formato de las plantillas del sitio). */
export function weeklyEmail(r: WeeklyReport): { subject: string; body: string } {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const s = r.shipping;
  const o = r.offers;
  const c = r.community;

  const todo: string[] = [];
  if (s.toShip > 0) todo.push(`**Despachar ${s.toShip} pedido${s.toShip === 1 ? "" : "s"}**${s.late > 0 ? ` (${s.late} con más de 48 h: primero esos)` : ""}.`);
  if (o.open > 0) todo.push(`**Responder ${o.open} oferta${o.open === 1 ? "" : "s"} de clientes** antes de que venzan.`);
  if (o.acceptedUnpaid > 0) todo.push(`Escribirle a ${o.acceptedUnpaid} cliente${o.acceptedUnpaid === 1 ? "" : "s"} con oferta aceptada que no ha pagado.`);
  if (r.overdue.count > 0) todo.push(`**Cobrar ${r.overdue.count} pago${r.overdue.count === 1 ? "" : "s"} vencido${r.overdue.count === 1 ? "" : "s"}** (${formatPrice(r.overdue.amount)}).`);
  if (c.pendingQuestions > 0) todo.push(`Responder ${c.pendingQuestions} consulta${c.pendingQuestions === 1 ? "" : "s"} de vendedores.`);
  if (c.pendingReviews > 0) todo.push(`Aprobar ${c.pendingReviews} reseña${c.pendingReviews === 1 ? "" : "s"}.`);
  if (r.catalog.noPhoto > 0) todo.push(`Subir foto a ${r.catalog.noPhoto} par${r.catalog.noPhoto === 1 ? "" : "es"} publicado${r.catalog.noPhoto === 1 ? "" : "s"} sin foto.`);

  const body = [
    "# Tu semana en ==Pitsneakers==",
    "",
    `Del ${niceDate(r.from)} al ${niceDate(r.to)}, comparado con la semana anterior.`,
    "",
    `> **Pedidos web pagados:** ${r.webOrders.now.count} · ${formatPrice(r.webOrders.now.amount)} (${compare(r.webOrders.now.amount, r.webOrders.before.amount, true)})`,
    `> **Pares vendidos por vendedores:** ${r.sellerSales.now.count} · ${formatPrice(r.sellerSales.now.amount)} (${compare(r.sellerSales.now.amount, r.sellerSales.before.amount, true)})`,
    `> **Cobros recibidos:** ${formatPrice(r.collected.now)} (${compare(r.collected.now, r.collected.before, true)})`,
    "",
    "**Envíos**",
    `- Despachados: ${s.shipped}${s.avgHoursToShip !== null ? ` · del pago al despacho tardaron ${s.avgHoursToShip} h en promedio` : ""}`,
    `- Entregados: ${s.delivered}`,
    `- Por despachar ahora: ${s.toShip}${s.late > 0 ? ` (**${s.late} con más de 48 h**)` : ""}`,
    "",
    "**Ofertas de clientes**",
    o.received === 0
      ? "- No llegaron ofertas esta semana."
      : `- Llegaron ${o.received}: ${o.paid} pagada${o.paid === 1 ? "" : "s"}, ${o.acceptedUnpaid} aceptada${o.acceptedUnpaid === 1 ? "" : "s"} sin pagar, ${o.open} por responder, ${o.rejected} rechazada${o.rejected === 1 ? "" : "s"}, ${o.expired} vencida${o.expired === 1 ? "" : "s"} sin respuesta`,
    "",
    "**Comunidad**",
    `- Compradores nuevos: ${c.newBuyers}`,
    `- Reseñas nuevas: ${c.newReviews}${c.avgRating !== null ? ` · promedio ${String(c.avgRating).replace(".", ",")} de 5` : ""}`,
    "",
    ...(todo.length ? ["**Para esta semana**", ...todo.map((t) => `- ${t}`), ""] : ["**Para esta semana**", "- Nada pendiente. Buen momento para subir pares nuevos o escribirle a la comunidad.", ""]),
    ...(r.idleStock.total > 0
      ? [
          "**Pares que llevan más tiempo sin moverse**",
          `- ${r.idleStock.total} en stock de vendedores, ${r.idleStock.over60} con más de 60 días.`,
          ...r.idleStock.oldest.map((i) => `- ${i.name}${i.size ? ` · talla ${i.size}` : ""} · ${i.days} días · ${i.seller}`),
          "",
        ]
      : []),
    `[boton: Abrir el panel | ${base}/admin]`,
  ].join("\n");

  const subject = `📊 Tu semana en Pitsneakers: ${r.webOrders.now.count} pedido${r.webOrders.now.count === 1 ? "" : "s"} · ${formatPrice(r.webOrders.now.amount)}${s.late > 0 ? ` · ⚠️ ${s.late} atrasado${s.late === 1 ? "" : "s"}` : ""}`;
  return { subject, body };
}
