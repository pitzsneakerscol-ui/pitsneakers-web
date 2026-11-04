import "server-only";
import { listOrders, pendingPaidCount } from "@/lib/catalog-orders";
import { isLate, isToShip } from "@/lib/fulfillment-shared";
import { listAllBuyerOffers, pendingOfferCount } from "@/lib/buyer-offers";
import { listAllQuestions } from "@/lib/market";
import { listReviews } from "@/lib/reviews";
import { listPayments } from "@/lib/admin";
import { getAllGroups } from "@/lib/products";
import { getDb } from "@/lib/db";
import { waNumber } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { todayBogota } from "@/lib/reseller-shared";

/** Una cosa concreta por hacer, con el enlace directo para hacerla. */
export interface QueueItem {
  key: string;
  title: string;
  detail: string;
  href: string;
  /** "bad" = ya pasó el plazo o está por vencer; "warn" = conviene hacerlo hoy */
  tone?: "bad" | "warn";
  /** enlace de WhatsApp al cliente, si aplica */
  whatsapp?: string;
}

export interface QueueSection {
  id: string;
  title: string;
  /** total real (los items son solo los primeros) */
  count: number;
  urgent: boolean;
  href: string;
  hrefLabel: string;
  items: QueueItem[];
}

const HOUR = 3_600_000;
const SHOW = 5;

const cleanName = (brand: string, name: string) => `${brand} ${name}`.trim().replace(/^(\S+) \1 /, "$1 ");

/** "en 5 h", "en 2 días", "ya venció". */
function timeLeft(ms: number, now: number): string {
  const diff = ms - now;
  if (diff <= 0) return "ya venció";
  if (diff < HOUR) return "en menos de 1 h";
  if (diff < 48 * HOUR) return `en ${Math.floor(diff / HOUR)} h`;
  return `en ${Math.floor(diff / (24 * HOUR))} días`;
}

/** "hace 3 h", "hace 2 días". */
function since(ms: number, now: number): string {
  const diff = now - ms;
  if (diff < HOUR) return "hace menos de 1 h";
  if (diff < 48 * HOUR) return `hace ${Math.floor(diff / HOUR)} h`;
  return `hace ${Math.floor(diff / (24 * HOUR))} días`;
}

const wa = (phone: string) => {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}` : undefined;
};

/** Lo que el dueño debe atender hoy, ordenado: primero lo urgente. Solo aparecen las secciones con algo pendiente. */
export async function getTodayQueue(): Promise<{ sections: QueueSection[]; urgent: number; total: number }> {
  const now = Date.now();
  const [orders, offers, questions, reviews, overdue, groups] = await Promise.all([
    listOrders(),
    listAllBuyerOffers("abiertas"),
    listAllQuestions("pendiente", 50),
    listReviews().catch(() => []),
    listPayments("vencido"),
    getAllGroups(),
  ]);

  const sections: QueueSection[] = [];

  // 1. Pedidos pagados que todavía no salen (los más viejos primero).
  const toShip = orders
    .filter((o) => o.status === "pagado" && isToShip(o.fulfillment))
    .sort((a, b) => (a.paidAt ?? a.createdAt) - (b.paidAt ?? b.createdAt));
  if (toShip.length) {
    const late = toShip.filter((o) => isLate(o.fulfillment, o.paidAt, o.createdAt));
    sections.push({
      id: "pedidos",
      title: "Pedidos por despachar",
      count: toShip.length,
      urgent: late.length > 0,
      href: "/admin/pedidos?f=por-despachar",
      hrefLabel: "Ir a pedidos",
      items: toShip.slice(0, SHOW).map((o) => {
        const isOld = isLate(o.fulfillment, o.paidAt, o.createdAt);
        return {
          key: o.reference,
          title: `${cleanName(o.brand, o.productName)}${o.size && o.size !== "Única" ? ` · talla ${o.size}` : ""}`,
          detail: `${o.buyerName} · ${o.buyerCity || "—"} · pagado ${since(o.paidAt ?? o.createdAt, now)}${isOld ? " · ATRASADO" : ""}`,
          href: `/admin/pedidos?f=por-despachar#${o.reference}`,
          tone: isOld ? "bad" : undefined,
          whatsapp: wa(o.buyerPhone),
        };
      }),
    });
  }

  // 2. Ofertas de clientes sin responder: las de ligas altas primero, luego las que vencen antes.
  const pendingOffers = offers
    .filter((o) => o.status === "pendiente" && o.expiresAt > now)
    .sort((a, b) => Number(b.priority) - Number(a.priority) || a.expiresAt - b.expiresAt);
  if (pendingOffers.length) {
    sections.push({
      id: "ofertas",
      title: "Ofertas de clientes por responder",
      count: pendingOffers.length,
      urgent: pendingOffers.some((o) => o.expiresAt - now < 24 * HOUR),
      href: "/admin/ofertas-clientes",
      hrefLabel: "Responder ofertas",
      items: pendingOffers.slice(0, SHOW).map((o) => ({
        key: `o${o.id}`,
        title: `${o.buyerName} ofrece ${formatPrice(o.amount)} por ${cleanName(o.brand, o.productName)}`,
        detail: `Precio ${formatPrice(o.listPrice)}${o.size ? ` · talla ${o.size}` : ""} · ${o.priority ? `liga ${o.league} (prioridad) · ` : ""}responder ${timeLeft(o.expiresAt, now)}`,
        href: "/admin/ofertas-clientes",
        tone: o.expiresAt - now < 24 * HOUR ? "bad" : o.priority ? "warn" : undefined,
        whatsapp: wa(o.buyerPhone),
      })),
    });
  }

  // 3. Ofertas ya aceptadas que el cliente no ha pagado (vale la pena un recordatorio).
  const unpaid = offers.filter((o) => o.status === "aceptada" && o.expiresAt > now).sort((a, b) => a.expiresAt - b.expiresAt);
  if (unpaid.length) {
    sections.push({
      id: "aceptadas",
      title: "Ofertas aceptadas sin pagar",
      count: unpaid.length,
      urgent: false,
      href: "/admin/ofertas-clientes",
      hrefLabel: "Ver ofertas",
      items: unpaid.slice(0, SHOW).map((o) => ({
        key: `a${o.id}`,
        title: `${o.buyerName} · ${cleanName(o.brand, o.productName)} a ${formatPrice(o.agreedAmount || o.amount)}`,
        detail: `Tiene que pagar ${timeLeft(o.expiresAt, now)}. Un recordatorio por WhatsApp ayuda.`,
        href: "/admin/ofertas-clientes",
        tone: o.expiresAt - now < 6 * HOUR ? "warn" : undefined,
        whatsapp: wa(o.buyerPhone),
      })),
    });
  }

  // 4. Cobros vencidos (revendedores y compradores).
  if (overdue.length) {
    sections.push({
      id: "pagos",
      title: "Cobros vencidos",
      count: overdue.length,
      urgent: true,
      href: "/admin/pagos?estado=vencido",
      hrefLabel: "Ver pagos",
      items: overdue.slice(0, SHOW).map((p) => ({
        key: `p${p.id}`,
        title: `${p.partyName} · ${formatPrice(p.amount)}`,
        detail: `${p.concept} · venció ${p.dueDate}`,
        href: "/admin/pagos?estado=vencido",
        tone: "bad" as const,
      })),
    });
  }

  // 5. Consultas de mercado que los vendedores esperan.
  if (questions.length) {
    sections.push({
      id: "consultas",
      title: "Consultas de vendedores sin responder",
      count: questions.length,
      urgent: questions.some((q) => now - q.createdAt > 24 * HOUR),
      href: "/admin/consultas",
      hrefLabel: "Responder",
      items: questions.slice(0, SHOW).map((q) => ({
        key: `q${q.id}`,
        title: `${q.sellerName}: ${q.model}${q.size ? ` · talla ${q.size}` : ""}`,
        detail: `${q.buyPrice ? `Precio de compra ${formatPrice(q.buyPrice)} · ` : ""}preguntó ${since(q.createdAt, now)}`,
        href: "/admin/consultas",
        tone: now - q.createdAt > 24 * HOUR ? "warn" : undefined,
      })),
    });
  }

  // 6. Reseñas esperando aprobación.
  const pendingReviews = reviews.filter((r) => r.status === "pending");
  if (pendingReviews.length) {
    sections.push({
      id: "resenas",
      title: "Reseñas por aprobar",
      count: pendingReviews.length,
      urgent: false,
      href: "/admin/resenas",
      hrefLabel: "Revisar reseñas",
      items: pendingReviews.slice(0, SHOW).map((r) => ({
        key: `r${r.id}`,
        title: `${r.name || "Cliente"} · ${"★".repeat(Math.max(0, Math.min(5, r.rating)))}`,
        detail: `${r.product ? `${r.product} · ` : ""}${r.text.slice(0, 80)}${r.text.length > 80 ? "…" : ""}`,
        href: "/admin/resenas",
      })),
    });
  }

  // 7. Catálogo: pares publicados sin foto (no salen en Destacados ni en el feed de Google).
  const noPhoto = groups.filter((g) => g.images.length === 0);
  if (noPhoto.length) {
    sections.push({
      id: "sin-foto",
      title: "Pares publicados sin foto",
      count: noPhoto.length,
      urgent: false,
      href: `/producto/${noPhoto[0].groupSlug}`,
      hrefLabel: "Abrir el primero",
      items: noPhoto.slice(0, SHOW).map((g) => ({
        key: g.groupSlug,
        title: cleanName(g.brand, g.name),
        detail: "Sin foto: no aparece en Google Shopping ni en Destacados.",
        href: `/producto/${g.groupSlug}`,
      })),
    });
  }

  sections.sort((a, b) => Number(b.urgent) - Number(a.urgent));
  const urgent = sections.filter((s) => s.urgent).reduce((n, s) => n + s.count, 0);
  return { sections, urgent, total: sections.reduce((n, s) => n + s.count, 0) };
}

/**
 * Número para la insignia del menú: pedidos por despachar + ofertas por responder + cobros vencidos.
 * Son solo conteos, así que es barato calcularlo en cada pantalla del panel.
 */
export async function todayBadgeCount(): Promise<number> {
  try {
    const db = await getDb();
    const today = todayBogota();
    const [toShip, offers, overdue] = await Promise.all([
      pendingPaidCount(),
      pendingOfferCount(),
      db.execute({ sql: "SELECT COUNT(*) AS n FROM payments WHERE status = 'pendiente' AND due_date != '' AND due_date < ?", args: [today] }),
    ]);
    return toShip + offers + Number(overdue.rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}
