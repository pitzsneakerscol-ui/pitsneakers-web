import "server-only";
import { getDb } from "@/lib/db";
import { siteConfig } from "@/config/site";
import type { Buyer } from "@/lib/buyers";
import { minOffer } from "@/lib/buyer-shared";
import type { Product } from "@/types/product";

export type BuyerOfferStatus = "pendiente" | "contraoferta" | "aceptada" | "pagada" | "rechazada" | "retirada" | "vencida";

export interface BuyerOffer {
  id: number;
  buyerId: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  productId: string;
  productName: string;
  brand: string;
  size: string;
  image: string;
  listPrice: number;
  amount: number;
  counterAmount: number;
  agreedAmount: number;
  responseNote: string;
  orderRef: string;
  status: BuyerOfferStatus;
  expiresAt: number;
  createdAt: number;
  respondedAt: number | null;
}

const HOUR = 60 * 60 * 1000;
const OPEN: BuyerOfferStatus[] = ["pendiente", "contraoferta", "aceptada"];

const SELECT = `SELECT o.*, b.name AS b_name, b.email AS b_email, b.phone AS b_phone FROM buyer_offers o JOIN buyers b ON b.id = o.buyer_id`;

function toOffer(r: Record<string, unknown>, now: number): BuyerOffer {
  let status = String(r.status) as BuyerOfferStatus;
  // Una oferta abierta que ya pasó su plazo se muestra como vencida (no hace falta una tarea programada).
  if (OPEN.includes(status) && Number(r.expires_at) < now) status = "vencida";
  return {
    id: Number(r.id),
    buyerId: Number(r.buyer_id),
    buyerName: String(r.b_name ?? ""),
    buyerEmail: String(r.b_email ?? ""),
    buyerPhone: String(r.b_phone ?? ""),
    productId: String(r.product_id),
    productName: String(r.product_name),
    brand: String(r.brand),
    size: String(r.size),
    image: String(r.image),
    listPrice: Number(r.list_price),
    amount: Number(r.amount),
    counterAmount: Number(r.counter_amount),
    agreedAmount: Number(r.agreed_amount),
    responseNote: String(r.response_note),
    orderRef: String(r.order_ref),
    status,
    expiresAt: Number(r.expires_at),
    createdAt: Number(r.created_at),
    respondedAt: r.responded_at === null || r.responded_at === undefined ? null : Number(r.responded_at),
  };
}

export async function listBuyerOffers(buyerId: number): Promise<BuyerOffer[]> {
  const db = await getDb();
  const r = await db.execute({ sql: `${SELECT} WHERE o.buyer_id = ? ORDER BY o.created_at DESC LIMIT 100`, args: [buyerId] });
  const now = Date.now();
  return r.rows.map((x) => toOffer(x, now));
}

export async function listAllBuyerOffers(filter: "todas" | "pendiente" | "abiertas"): Promise<BuyerOffer[]> {
  const db = await getDb();
  const r = await db.execute(`${SELECT} ORDER BY o.created_at DESC LIMIT 300`);
  const now = Date.now();
  const all = r.rows.map((x) => toOffer(x, now));
  if (filter === "pendiente") return all.filter((o) => o.status === "pendiente");
  if (filter === "abiertas") return all.filter((o) => ["pendiente", "contraoferta", "aceptada"].includes(o.status));
  return all;
}

export async function getBuyerOffer(id: number): Promise<BuyerOffer | null> {
  const db = await getDb();
  const r = await db.execute({ sql: `${SELECT} WHERE o.id = ?`, args: [id] });
  return r.rows[0] ? toOffer(r.rows[0], Date.now()) : null;
}

export async function pendingOfferCount(): Promise<number> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM buyer_offers WHERE status = 'pendiente' AND expires_at > ?", args: [Date.now()] });
  return Number(r.rows[0].n);
}

export type OfferResult = { ok: true; offer: BuyerOffer } | { ok: false; error: string };

export async function createBuyerOffer(buyer: Buyer, product: Product, size: string, amount: number): Promise<OfferResult> {
  const price = product.price;
  if (!(price > 0)) return { ok: false, error: "Este par no tiene precio publicado." };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "Escribe un valor válido." };
  if (amount >= price) return { ok: false, error: "Tu oferta debe ser menor al precio. Si lo quieres a ese precio, usa Comprar ahora." };
  const min = minOffer(price);
  if (amount < min) return { ok: false, error: `La oferta mínima para este par es ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(min)}.` };

  const db = await getDb();
  const now = Date.now();
  const open = await db.execute({
    sql: "SELECT product_id, size FROM buyer_offers WHERE buyer_id = ? AND status IN ('pendiente','contraoferta','aceptada') AND expires_at > ?",
    args: [buyer.id, now],
  });
  if (open.rows.length >= siteConfig.offers.maxActive) return { ok: false, error: `Ya tienes ${siteConfig.offers.maxActive} ofertas abiertas. Espera respuesta o retira alguna.` };
  if (open.rows.some((x) => String(x.product_id) === product.id && String(x.size) === size)) return { ok: false, error: "Ya tienes una oferta abierta por este par y talla. Retírala si quieres cambiar el valor." };

  const ins = await db.execute({
    sql: `INSERT INTO buyer_offers (buyer_id, product_id, product_name, brand, size, image, list_price, amount, expires_at, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?)`,
    args: [buyer.id, product.id, product.name, product.brand, size, product.images[0] ?? "", price, amount, now + siteConfig.offers.replyHours * HOUR, now],
  });
  return { ok: true, offer: (await getBuyerOffer(Number(ins.lastInsertRowid)))! };
}

/** Cambia el estado solo si la oferta sigue en el estado esperado y no venció (dos clics seguidos no se pisan). */
async function transition(id: number, from: BuyerOfferStatus[], set: string, args: (string | number)[]): Promise<boolean> {
  const db = await getDb();
  const now = Date.now();
  const r = await db.execute({
    sql: `UPDATE buyer_offers SET ${set}, responded_at = ? WHERE id = ? AND status IN (${from.map(() => "?").join(",")}) AND expires_at > ?`,
    args: [...args, now, id, ...from, now],
  });
  return r.rowsAffected > 0;
}

/** El dueño acepta: el comprador tiene payHours horas para pagar al precio acordado. */
export async function acceptOffer(id: number): Promise<boolean> {
  const o = await getBuyerOffer(id);
  if (!o) return false;
  return transition(id, ["pendiente"], "status = 'aceptada', agreed_amount = amount, expires_at = ?", [Date.now() + siteConfig.offers.payHours * HOUR]);
}

export async function rejectOffer(id: number, note: string): Promise<boolean> {
  return transition(id, ["pendiente", "contraoferta"], "status = 'rechazada', response_note = ?", [note]);
}

export async function counterOffer(id: number, amount: number, note: string): Promise<boolean> {
  return transition(id, ["pendiente"], "status = 'contraoferta', counter_amount = ?, response_note = ?, expires_at = ?", [amount, note, Date.now() + siteConfig.offers.replyHours * HOUR]);
}

/** El comprador acepta la contraoferta: queda acordada al precio del dueño. */
export async function acceptCounter(buyerId: number, id: number): Promise<boolean> {
  const o = await getBuyerOffer(id);
  if (!o || o.buyerId !== buyerId || o.counterAmount <= 0) return false;
  return transition(id, ["contraoferta"], "status = 'aceptada', agreed_amount = counter_amount, expires_at = ?", [Date.now() + siteConfig.offers.payHours * HOUR]);
}

export async function withdrawOffer(buyerId: number, id: number): Promise<boolean> {
  const o = await getBuyerOffer(id);
  if (!o || o.buyerId !== buyerId) return false;
  return transition(id, ["pendiente", "contraoferta", "aceptada"], "status = 'retirada'", []);
}

export async function attachOrder(id: number, ref: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE buyer_offers SET order_ref = ? WHERE id = ?", args: [ref, id] });
}

/** Cuando Wompi confirma el pago del pedido, la oferta pasa a "pagada". */
export async function markOfferPaid(orderRef: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE buyer_offers SET status = 'pagada' WHERE order_ref = ? AND status = 'aceptada'", args: [orderRef] });
}
