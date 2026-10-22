import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { consumeCredit } from "@/lib/trivia";
import { markOfferPaid } from "@/lib/buyer-offers";

export type OrderStatus = "pendiente" | "pagado" | "rechazado" | "anulado" | "error";

export interface CatalogOrder {
  id: number;
  reference: string;
  productId: string;
  productName: string;
  brand: string;
  size: string;
  condition: string;
  image: string;
  /** lo que se cobra (ya con el crédito descontado) */
  amount: number;
  creditCode: string;
  discount: number;
  /** costo de pago en línea incluido en el total cobrado */
  fee: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerCity: string;
  shipDepartment: string;
  shipAddress: string;
  shipComplement: string;
  shipDocument: string;
  shipNotes: string;
  status: OrderStatus;
  wompiId: string;
  paymentMethod: string;
  emailed: boolean;
  createdAt: number;
  paidAt: number | null;
}

const toOrder = (r: Record<string, unknown>): CatalogOrder => ({
  id: Number(r.id),
  reference: String(r.reference),
  productId: String(r.product_id),
  productName: String(r.product_name),
  brand: String(r.brand),
  size: String(r.size),
  condition: String(r.condition),
  image: String(r.image),
  amount: Number(r.amount),
  creditCode: String(r.credit_code ?? ""),
  discount: Number(r.discount ?? 0),
  fee: Number(r.fee ?? 0),
  buyerName: String(r.buyer_name),
  buyerEmail: String(r.buyer_email),
  buyerPhone: String(r.buyer_phone),
  buyerCity: String(r.buyer_city),
  shipDepartment: String(r.ship_department ?? ""),
  shipAddress: String(r.ship_address ?? ""),
  shipComplement: String(r.ship_complement ?? ""),
  shipDocument: String(r.ship_document ?? ""),
  shipNotes: String(r.ship_notes ?? ""),
  status: String(r.status) as OrderStatus,
  wompiId: String(r.wompi_id),
  paymentMethod: String(r.payment_method),
  emailed: Number(r.emailed) === 1,
  createdAt: Number(r.created_at),
  paidAt: r.paid_at === null || r.paid_at === undefined ? null : Number(r.paid_at),
});

// Sin 0/O/1/I: la referencia se dicta por WhatsApp sin confundirse.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => "PITS-" + Array.from(randomBytes(7), (b) => ALPHABET[b % ALPHABET.length]).join("");

export async function createOrder(o: Omit<CatalogOrder, "id" | "reference" | "status" | "wompiId" | "paymentMethod" | "emailed" | "createdAt" | "paidAt">): Promise<CatalogOrder> {
  const db = await getDb();
  for (let i = 0; i < 5; i++) {
    const reference = newReference();
    const r = await db.execute({
      sql: `INSERT OR IGNORE INTO catalog_orders
            (reference, product_id, product_name, brand, size, condition, image, amount, credit_code, discount, fee, buyer_name, buyer_email, buyer_phone, buyer_city, ship_department, ship_address, ship_complement, ship_document, ship_notes, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [reference, o.productId, o.productName, o.brand, o.size, o.condition, o.image, o.amount, o.creditCode, o.discount, o.fee, o.buyerName, o.buyerEmail, o.buyerPhone, o.buyerCity, o.shipDepartment, o.shipAddress, o.shipComplement, o.shipDocument, o.shipNotes, Date.now()],
    });
    if (r.rowsAffected > 0) return (await getOrderByRef(reference))!;
  }
  throw new Error("No se pudo generar la referencia del pedido.");
}

export async function getOrderByRef(reference: string): Promise<CatalogOrder | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM catalog_orders WHERE reference = ?", args: [reference] });
  return r.rows[0] ? toOrder(r.rows[0]) : null;
}

export async function listOrders(): Promise<CatalogOrder[]> {
  const db = await getDb();
  const r = await db.execute("SELECT * FROM catalog_orders ORDER BY created_at DESC LIMIT 300");
  return r.rows.map(toOrder);
}

export async function pendingPaidCount(): Promise<number> {
  const db = await getDb();
  const r = await db.execute("SELECT COUNT(*) AS n FROM catalog_orders WHERE status = 'pagado'");
  return Number(r.rows[0].n);
}

const STATUS_MAP: Record<string, OrderStatus> = { APPROVED: "pagado", DECLINED: "rechazado", VOIDED: "anulado", ERROR: "error", PENDING: "pendiente" };

/**
 * Aplica el resultado que reporta Wompi. Un pedido ya pagado no se vuelve a cambiar (los eventos pueden llegar repetidos o desordenados).
 * Devuelve el pedido y si acaba de pasar a "pagado" (para avisar por correo una sola vez).
 */
export async function applyTransaction(tx: { reference: string; id: string; status: string; amountCents: number; method?: string }): Promise<{ order: CatalogOrder; justPaid: boolean } | null> {
  const order = await getOrderByRef(tx.reference);
  if (!order) return null;
  // El monto que cobró Wompi debe ser el del pedido; si no, se marca como error y no se da por pagado.
  const next: OrderStatus = tx.amountCents === order.amount * 100 ? (STATUS_MAP[tx.status] ?? "pendiente") : "error";
  if (order.status === "pagado") return { order, justPaid: false };
  const db = await getDb();
  const paying = next === "pagado";
  await db.execute({
    sql: "UPDATE catalog_orders SET status = ?, wompi_id = ?, payment_method = ?, paid_at = ? WHERE id = ? AND status != 'pagado'",
    args: [next, tx.id, tx.method ?? "", paying ? Date.now() : null, order.id],
  });
  if (paying) {
    await consumeCredit(order.creditCode, order.reference);
    await markOfferPaid(order.reference);
  }
  return { order: (await getOrderByRef(tx.reference))!, justPaid: paying };
}

/** Marca que ya se mandaron los correos de un pedido pagado (evita duplicados si Wompi repite el evento). */
export async function markEmailed(orderId: number): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: "UPDATE catalog_orders SET emailed = 1 WHERE id = ? AND emailed = 0", args: [orderId] });
  return r.rowsAffected > 0;
}
