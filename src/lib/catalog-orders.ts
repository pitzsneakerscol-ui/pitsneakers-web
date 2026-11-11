import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { consumeCredit } from "@/lib/trivia";
import { markOfferPaid } from "@/lib/buyer-offers";
import { DIRECT_CARRIER, PICKUP_CARRIER, isFulfillment, type Fulfillment } from "@/lib/fulfillment-shared";
import type { Delivery } from "@/lib/delivery-shared";
import { MAX_PHOTOS, parseChecks, parseVerifResult, type VerifKey, type VerifResult } from "@/lib/verification-shared";
import { parsePayoutStatus, type PayoutStatus } from "@/lib/payout-shared";
import { sellerBreakdown } from "@/lib/payout";
import { sellerForProductId } from "@/lib/offer-seller";

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
  /** costo de envío cobrado en el checkout, incluido en amount (0 = recoge o pedido anterior al cobro de envío) */
  shipFee: number;
  /** aumento de campaña incluido en amount (Black Friday: cubre el envío gratis). No se le paga al revendedor. */
  bfMarkup: number;
  /** "recogida" = el comprador lo recoge en el punto de verificación; no lleva guía ni transportadora */
  delivery: Delivery;
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
  /** seguimiento del envío ("" = pedido anterior al seguimiento) */
  fulfillment: Fulfillment;
  carrier: string;
  tracking: string;
  /** nota interna del equipo (no se muestra al cliente) */
  shipNote: string;
  shippedAt: number | null;
  deliveredAt: number | null;
  /** guía comprada en Skydropx ("" = todavía no) */
  skyShipmentId: string;
  labelUrl: string;
  /** costo de la guía en créditos de Skydropx */
  shipCost: number;
  shipPostal: string;
  /** último estado del recorrido según la transportadora ("" = sin datos todavía) */
  skyStatus: string;
  trackedAt: number | null;
  /** puntos de la verificación marcados al recibir el par */
  verifChecks: VerifKey[];
  verifBy: string;
  verifAt: number | null;
  /** nota interna de la verificación (no se muestra al cliente) */
  verifNote: string;
  /** conclusión y mensaje que ve el revendedor dueño del par */
  verifResult: VerifResult;
  verifSellerNote: string;
  /** revendedor dueño del par (null = todavía no se averiguó, 0 = par de la casa) */
  sellerId: number | null;
  /** lo que recibe el revendedor (precio del par menos comisión y envío) */
  payoutAmount: number;
  payoutStatus: PayoutStatus;
  payoutStartedAt: number | null;
  payoutPaidAt: number | null;
  /** cuándo se le confirmó el pedido al revendedor (null = todavía no) */
  sellerConfirmedAt: number | null;
  /** cuándo el revendedor avisó que ya dejó el par en el punto de verificación (null = todavía no) */
  sellerDroppedAt: number | null;
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
  shipFee: Number(r.ship_fee ?? 0),
  bfMarkup: Number(r.bf_markup ?? 0),
  delivery: String(r.delivery ?? "") === "recogida" ? "recogida" : "envio",
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
  fulfillment: isFulfillment(String(r.fulfillment ?? "")) ? (String(r.fulfillment ?? "") as Fulfillment) : "",
  carrier: String(r.carrier ?? ""),
  tracking: String(r.tracking ?? ""),
  shipNote: String(r.ship_note ?? ""),
  shippedAt: r.shipped_at === null || r.shipped_at === undefined ? null : Number(r.shipped_at),
  deliveredAt: r.delivered_at === null || r.delivered_at === undefined ? null : Number(r.delivered_at),
  skyShipmentId: String(r.sky_shipment_id ?? ""),
  labelUrl: String(r.label_url ?? ""),
  shipCost: Number(r.ship_cost ?? 0),
  shipPostal: String(r.ship_postal ?? ""),
  skyStatus: String(r.sky_status ?? ""),
  trackedAt: r.tracked_at === null || r.tracked_at === undefined ? null : Number(r.tracked_at),
  verifChecks: parseChecks(String(r.verif_checks ?? "")),
  verifBy: String(r.verif_by ?? ""),
  verifAt: r.verif_at === null || r.verif_at === undefined ? null : Number(r.verif_at),
  verifNote: String(r.verif_note ?? ""),
  verifResult: parseVerifResult(r.verif_result),
  verifSellerNote: String(r.verif_seller_note ?? ""),
  sellerId: r.seller_id === null || r.seller_id === undefined ? null : Number(r.seller_id),
  payoutAmount: Number(r.payout_amount ?? 0),
  payoutStatus: parsePayoutStatus(String(r.payout_status ?? "")),
  payoutStartedAt: r.payout_started_at === null || r.payout_started_at === undefined ? null : Number(r.payout_started_at),
  payoutPaidAt: r.payout_paid_at === null || r.payout_paid_at === undefined ? null : Number(r.payout_paid_at),
  sellerConfirmedAt: r.seller_confirmed_at === null || r.seller_confirmed_at === undefined ? null : Number(r.seller_confirmed_at),
  sellerDroppedAt: r.seller_dropped_at === null || r.seller_dropped_at === undefined ? null : Number(r.seller_dropped_at),
});

// Sin 0/O/1/I: la referencia se dicta por WhatsApp sin confundirse.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => "PITS-" + Array.from(randomBytes(7), (b) => ALPHABET[b % ALPHABET.length]).join("");

export async function createOrder(o: Omit<CatalogOrder, "id" | "reference" | "status" | "wompiId" | "paymentMethod" | "emailed" | "createdAt" | "paidAt" | "fulfillment" | "carrier" | "tracking" | "shipNote" | "shippedAt" | "deliveredAt" | "skyShipmentId" | "labelUrl" | "shipCost" | "skyStatus" | "trackedAt" | "verifChecks" | "verifBy" | "verifAt" | "verifNote" | "verifResult" | "verifSellerNote" | "sellerId" | "payoutAmount" | "payoutStatus" | "payoutStartedAt" | "payoutPaidAt" | "sellerConfirmedAt" | "sellerDroppedAt" | "shipFee" | "bfMarkup" | "delivery"> & { shipFee?: number; bfMarkup?: number; delivery?: Delivery; shipPostal?: string }): Promise<CatalogOrder> {
  const db = await getDb();
  for (let i = 0; i < 5; i++) {
    const reference = newReference();
    const r = await db.execute({
      sql: `INSERT OR IGNORE INTO catalog_orders
            (reference, product_id, product_name, brand, size, condition, image, amount, credit_code, discount, fee, ship_fee, bf_markup, delivery, buyer_name, buyer_email, buyer_phone, buyer_city, ship_department, ship_address, ship_complement, ship_document, ship_notes, ship_postal, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [reference, o.productId, o.productName, o.brand, o.size, o.condition, o.image, o.amount, o.creditCode, o.discount, o.fee, o.shipFee ?? 0, o.bfMarkup ?? 0, o.delivery === "recogida" ? "recogida" : "", o.buyerName, o.buyerEmail, o.buyerPhone, o.buyerCity, o.shipDepartment, o.shipAddress, o.shipComplement, o.shipDocument, o.shipNotes, o.shipPostal ?? "", Date.now()],
    });
    if (r.rowsAffected > 0) {
      const created = (await getOrderByRef(reference))!;
      // Saber de quién es el par no debe frenar la compra: si falla, se reintenta al abrir los pedidos del revendedor.
      await attachSeller(created).catch((e) => console.error("[pedidos] no se pudo asignar el vendedor:", e));
      return (await getOrderById(created.id)) ?? created;
    }
  }
  throw new Error("No se pudo generar la referencia del pedido.");
}

/** Precio del par sin el costo de pago en línea, sin el envío, sin el aumento de campaña y sin el crédito: sobre eso se calcula lo que recibe el vendedor. */
const basePrice = (o: Pick<CatalogOrder, "amount" | "discount" | "fee" | "shipFee" | "bfMarkup">) => Math.max(0, o.amount + o.discount - o.fee - o.shipFee - o.bfMarkup);

/** Guarda de quién es el par del pedido y cuánto recibe. Un par que no es de un revendedor queda en 0 (de la casa). */
export async function attachSeller(order: CatalogOrder): Promise<void> {
  const seller = await sellerForProductId(order.productId);
  const db = await getDb();
  await db.execute({
    sql: "UPDATE catalog_orders SET seller_id = ?, payout_amount = ? WHERE id = ? AND seller_id IS NULL",
    args: [seller?.userId ?? 0, seller ? sellerBreakdown(basePrice(order), seller.kind).receives : 0, order.id],
  });
}

/** Pedidos pagados anteriores a esta función (o que fallaron al asignarse): se les busca el vendedor. */
export async function backfillSellers(limit = 40): Promise<void> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM catalog_orders WHERE status = 'pagado' AND seller_id IS NULL ORDER BY id DESC LIMIT ?", args: [limit] });
  for (const row of r.rows) await attachSeller(toOrder(row)).catch((e) => console.error("[pedidos] vendedor:", e));
}

/** Marca que el equipo le confirmó el pedido al revendedor (la primera fecha se conserva si se reenvía). */
export async function markSellerConfirmed(id: number): Promise<CatalogOrder | null> {
  const before = await getOrderById(id);
  if (!before || !before.sellerId) return null;
  const db = await getDb();
  await db.execute({ sql: "UPDATE catalog_orders SET seller_confirmed_at = COALESCE(seller_confirmed_at, ?) WHERE id = ?", args: [Date.now(), id] });
  return getOrderById(id);
}

/**
 * El revendedor avisa que ya dejó el par en el punto de verificación. Solo vale para sus propios pedidos pagados y confirmados;
 * devuelve el pedido solo la primera vez (para avisar al equipo una sola vez).
 */
export async function markSellerDropped(id: number, userId: number): Promise<CatalogOrder | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: "UPDATE catalog_orders SET seller_dropped_at = ? WHERE id = ? AND seller_id = ? AND status = 'pagado' AND seller_confirmed_at IS NOT NULL AND seller_dropped_at IS NULL",
    args: [Date.now(), id, userId],
  });
  return r.rowsAffected > 0 ? getOrderById(id) : null;
}

/** Pedidos pagados de los pares de un revendedor, del más reciente al más antiguo. */
export async function listSellerOrders(userId: number): Promise<CatalogOrder[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT * FROM catalog_orders WHERE seller_id = ? AND status = 'pagado' ORDER BY COALESCE(paid_at, created_at) DESC LIMIT 200",
    args: [userId],
  });
  return r.rows.map(toOrder);
}

/**
 * Cambia el estado del pago al revendedor. Devuelve el pedido y si el estado realmente cambió
 * (para avisar una sola vez). "pagado" guarda la fecha; volver a "pendiente" borra las dos fechas.
 */
export async function setPayoutStatus(id: number, status: PayoutStatus): Promise<{ order: CatalogOrder; changed: boolean } | null> {
  const before = await getOrderById(id);
  if (!before || !before.sellerId) return null;
  if (before.payoutStatus === status) return { order: before, changed: false };
  const now = Date.now();
  const started = status === "pendiente" ? null : (before.payoutStartedAt ?? now);
  const paid = status === "pagado" ? now : null;
  const db = await getDb();
  await db.execute({
    sql: "UPDATE catalog_orders SET payout_status = ?, payout_started_at = ?, payout_paid_at = ? WHERE id = ?",
    args: [status === "pendiente" ? "" : status, started, paid, id],
  });
  return { order: (await getOrderById(id))!, changed: true };
}

export async function getOrderByRef(reference: string): Promise<CatalogOrder | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM catalog_orders WHERE reference = ?", args: [reference] });
  return r.rows[0] ? toOrder(r.rows[0]) : null;
}

export async function getOrderById(id: number): Promise<CatalogOrder | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM catalog_orders WHERE id = ?", args: [id] });
  return r.rows[0] ? toOrder(r.rows[0]) : null;
}

/** Pedido al que pertenece un envío de Skydropx (por id del envío o, si no, por número de guía). */
export async function getOrderByShipment(shipmentId: string, tracking: string): Promise<CatalogOrder | null> {
  const db = await getDb();
  if (shipmentId) {
    const r = await db.execute({ sql: "SELECT * FROM catalog_orders WHERE sky_shipment_id = ?", args: [shipmentId] });
    if (r.rows[0]) return toOrder(r.rows[0]);
  }
  if (tracking) {
    const r = await db.execute({ sql: "SELECT * FROM catalog_orders WHERE tracking = ? AND sky_shipment_id NOT IN ('', 'pending')", args: [tracking] });
    if (r.rows[0]) return toOrder(r.rows[0]);
  }
  return null;
}

/** Pedidos pagados con guía de Skydropx que todavía no se entregan y no se consultan desde hace `staleMs`. */
export async function listTrackable(staleMs: number, limit: number): Promise<CatalogOrder[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT * FROM catalog_orders
          WHERE status = 'pagado' AND sky_shipment_id NOT IN ('', 'pending') AND fulfillment IN ('por_preparar', 'hacia_verificacion', 'preparando', 'despachado', 'incidencia')
            AND (tracked_at IS NULL OR tracked_at < ?)
          ORDER BY COALESCE(tracked_at, 0) ASC LIMIT ?`,
    args: [Date.now() - staleMs, limit],
  });
  return r.rows.map(toOrder);
}

/** Guarda el estado del recorrido que reportó la transportadora y marca la hora de la consulta. */
/**
 * Guarda el estado de la transportadora solo si cambió (y el envío no está ya entregado). Devuelve true si cambió:
 * así dos avisos a la vez del mismo estado no mandan el correo dos veces.
 */
export async function markSkyStatus(id: number, skyStatus: string): Promise<boolean> {
  if (!skyStatus) return false;
  const db = await getDb();
  const r = await db.execute({
    sql: "UPDATE catalog_orders SET sky_status = ? WHERE id = ? AND sky_status <> ? AND sky_status <> 'delivered'",
    args: [skyStatus, id, skyStatus],
  });
  return r.rowsAffected > 0;
}

export async function setSkyStatus(id: number, skyStatus: string, number?: string, labelUrl?: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE catalog_orders SET sky_status = CASE WHEN ? <> '' AND sky_status <> 'delivered' THEN ? ELSE sky_status END, tracked_at = ?, tracking = CASE WHEN ? <> '' AND tracking = '' THEN ? ELSE tracking END, label_url = CASE WHEN ? <> '' AND label_url = '' THEN ? ELSE label_url END WHERE id = ?",
    args: [skyStatus, skyStatus, Date.now(), number ?? "", number ?? "", labelUrl ?? "", labelUrl ?? "", id],
  });
}

/**
 * Pasa un pedido de `from` a `to` solo si todavía está en `from` (así dos avisos a la vez no repiten el cambio ni los correos).
 * Devuelve el pedido actualizado y si la salida (primera vez despachado) es nueva, o null si otro proceso ya lo cambió.
 */
export async function advanceFulfillment(id: number, from: Fulfillment, to: "despachado" | "entregado" | "incidencia"): Promise<{ order: CatalogOrder; firstShip: boolean } | null> {
  const before = await getOrderById(id);
  if (!before) return null;
  const now = Date.now();
  const shippedAt = to === "incidencia" ? before.shippedAt : (before.shippedAt ?? now);
  const deliveredAt = to === "entregado" ? now : before.deliveredAt;
  const db = await getDb();
  const r = await db.execute({
    sql: "UPDATE catalog_orders SET fulfillment = ?, shipped_at = ?, delivered_at = ? WHERE id = ? AND fulfillment = ?",
    args: [to, shippedAt, deliveredAt, id, from],
  });
  if (r.rowsAffected === 0) return null;
  return { order: (await getOrderById(id))!, firstShip: to !== "incidencia" && before.shippedAt === null };
}

export async function listOrders(): Promise<CatalogOrder[]> {
  const db = await getDb();
  const r = await db.execute("SELECT * FROM catalog_orders ORDER BY created_at DESC LIMIT 300");
  return r.rows.map(toOrder);
}

/** Pedidos pagados que todavía no salen (por preparar o en preparación). */
export async function pendingPaidCount(): Promise<number> {
  const db = await getDb();
  const r = await db.execute("SELECT COUNT(*) AS n FROM catalog_orders WHERE status = 'pagado' AND fulfillment IN ('por_preparar','hacia_verificacion','preparando')");
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
    // Un pedido recién pagado entra a la cola de "por preparar".
    await db.execute({ sql: "UPDATE catalog_orders SET fulfillment = 'por_preparar' WHERE id = ? AND fulfillment = ''", args: [order.id] });
    await consumeCredit(order.creditCode, order.reference);
    await markOfferPaid(order.reference);
  }
  return { order: (await getOrderByRef(tx.reference))!, justPaid: paying };
}

/**
 * Venta cerrada fuera de la página (por WhatsApp): deja el pedido ya pagado, con el medio de pago que dijo el equipo, y lo pone
 * en el paso de envío donde esté el par hoy. Desde ahí sigue el mismo camino que una compra normal (guía, verificación, correos).
 */
export async function markManualPaid(id: number, method: string, step: "por_preparar" | "hacia_verificacion" | "preparando"): Promise<CatalogOrder | null> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE catalog_orders SET status = 'pagado', payment_method = ?, paid_at = ?, fulfillment = ? WHERE id = ? AND status <> 'pagado'",
    args: [method.slice(0, 60), Date.now(), step, id],
  });
  return getOrderById(id);
}

/** Marca que ya se mandaron los correos de un pedido pagado (evita duplicados si Wompi repite el evento). */
export async function markEmailed(orderId: number): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: "UPDATE catalog_orders SET emailed = 1 WHERE id = ? AND emailed = 0", args: [orderId] });
  return r.rowsAffected > 0;
}

/** Reserva el pedido para comprar su guía: evita pagar dos guías si se hace doble clic. Devuelve false si ya tiene una o está en proceso. */
export async function claimGuide(id: number): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: "UPDATE catalog_orders SET sky_shipment_id = 'pending' WHERE id = ? AND sky_shipment_id = ''", args: [id] });
  return r.rowsAffected > 0;
}

/** Quita la reserva si la compra falló, para poder reintentar. */
export async function releaseGuide(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE catalog_orders SET sky_shipment_id = '' WHERE id = ? AND sky_shipment_id = 'pending'", args: [id] });
}

export interface GuideSave {
  shipmentId: string;
  carrier: string;
  tracking: string;
  labelUrl: string;
  cost: number;
  postal: string;
}

/** Guarda la guía comprada. El paso del envío no cambia: despachar (y avisar al cliente) sigue siendo un clic aparte. */
export async function saveGuide(id: number, g: GuideSave): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE catalog_orders SET sky_shipment_id = ?, carrier = ?, tracking = ?, label_url = ?, ship_cost = ?, ship_postal = ? WHERE id = ?",
    args: [g.shipmentId, g.carrier, g.tracking.slice(0, 60), g.labelUrl, g.cost, g.postal, id],
  });
}

/** Guarda la verificación del par: puntos marcados, quién la hizo, cuándo y la nota interna. La hora se conserva si ya existía. */
export async function saveVerification(id: number, input: { checks: VerifKey[]; by: string; note: string; result?: VerifResult; sellerNote?: string }): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE catalog_orders SET verif_checks = ?, verif_by = ?, verif_at = COALESCE(verif_at, ?), verif_note = ?, verif_result = ?, verif_seller_note = ? WHERE id = ?",
    args: [input.checks.join(","), input.by.slice(0, 40), Date.now(), input.note.replace(/\s+/g, " ").trim().slice(0, 300), input.result ?? "", (input.sellerNote ?? "").replace(/\s+/g, " ").trim().slice(0, 400), id],
  });
}

/** Ids de las fotos de recepción de varios pedidos, en el orden en que se subieron. */
export async function listOrderPhotos(orderIds: number[]): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (orderIds.length === 0) return map;
  const db = await getDb();
  const r = await db.execute({ sql: `SELECT id, order_id FROM order_photos WHERE order_id IN (${orderIds.map(() => "?").join(",")}) ORDER BY id`, args: orderIds });
  for (const row of r.rows) {
    const k = Number(row.order_id);
    map.set(k, [...(map.get(k) ?? []), Number(row.id)]);
  }
  return map;
}

/** Cuántas fotos más se pueden subir a un pedido. */
export async function photoRoom(orderId: number): Promise<number> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM order_photos WHERE order_id = ?", args: [orderId] });
  return Math.max(0, MAX_PHOTOS - Number(r.rows[0]?.n ?? 0));
}

export async function addOrderPhoto(orderId: number, mime: string, data: Uint8Array): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "INSERT INTO order_photos (order_id, mime, data, created_at) VALUES (?, ?, ?, ?)", args: [orderId, mime, data, Date.now()] });
}

export async function getOrderPhoto(id: number): Promise<{ mime: string; data: Uint8Array } | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT mime, data FROM order_photos WHERE id = ?", args: [id] });
  const row = r.rows[0];
  if (!row) return null;
  const raw = row.data as unknown;
  const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw instanceof Uint8Array ? raw : new Uint8Array(0);
  return { mime: String(row.mime), data: bytes };
}

export async function deleteOrderPhoto(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM order_photos WHERE id = ?", args: [id] });
}

export interface FulfillmentInput {
  step: Fulfillment;
  carrier: string;
  tracking: string;
  note: string;
}

export type FulfillmentResult =
  | { ok: true; order: CatalogOrder; justShipped: boolean; justDelivered: boolean; shipmentChanged: boolean; before: Fulfillment }
  | { ok: false; error: string };

/**
 * Cambia el paso de envío de un pedido pagado. Para "despachado" exige transportadora y número de guía
 * (la guía no se pide en la entrega directa). Devuelve si es la primera vez que sale o se entrega, para avisar una sola vez.
 */
export async function updateFulfillment(id: number, input: FulfillmentInput): Promise<FulfillmentResult> {
  const order = await getOrderById(id);
  if (!order) return { ok: false, error: "No encontré ese pedido." };
  if (order.status !== "pagado") return { ok: false, error: "Solo se puede dar seguimiento a pedidos pagados." };
  if (!input.step) return { ok: false, error: "Elige el paso del envío." };

  // Si el comprador recoge en el punto de verificación, "despachado" significa "listo para recoger": sin transportadora ni guía.
  const pickup = order.delivery === "recogida";
  const carrier = pickup ? PICKUP_CARRIER : input.carrier.trim().slice(0, 40);
  const tracking = pickup ? "" : input.tracking.replace(/\s+/g, " ").trim().slice(0, 60);
  const note = input.note.replace(/\s+/g, " ").trim().slice(0, 300);

  if (input.step === "despachado" && !pickup) {
    if (!carrier) return { ok: false, error: "Para marcarlo despachado elige la transportadora." };
    if (carrier !== DIRECT_CARRIER && !tracking) return { ok: false, error: "Para marcarlo despachado escribe el número de guía." };
  }

  const now = Date.now();
  const left = input.step === "por_preparar" || input.step === "hacia_verificacion" || input.step === "preparando";
  const shippedAt = left ? null : (order.shippedAt ?? (input.step === "despachado" || input.step === "entregado" ? now : null));
  const deliveredAt = input.step === "entregado" ? (order.deliveredAt ?? now) : input.step === "incidencia" ? order.deliveredAt : null;
  const keepShipment = input.step === "despachado" || input.step === "entregado" || input.step === "incidencia";

  const db = await getDb();
  await db.execute({
    sql: "UPDATE catalog_orders SET fulfillment = ?, carrier = ?, tracking = ?, ship_note = ?, shipped_at = ?, delivered_at = ? WHERE id = ?",
    args: [input.step, keepShipment ? carrier : order.carrier, keepShipment ? tracking : order.tracking, note, shippedAt, deliveredAt, id],
  });

  return {
    ok: true,
    order: (await getOrderById(id))!,
    justShipped: input.step === "despachado" && order.shippedAt === null,
    justDelivered: input.step === "entregado" && order.deliveredAt === null,
    shipmentChanged: order.carrier !== carrier || order.tracking !== tracking,
    before: order.fulfillment,
  };
}
