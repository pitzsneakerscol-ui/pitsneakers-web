import "server-only";
import { getDb } from "@/lib/db";

export type OfferStatus = "pendiente" | "aceptada" | "rechazada" | "contraoferta";

export interface Offer {
  id: number;
  itemId: number;
  userId: number;
  sellerName: string;
  sellerEmail: string;
  itemName: string;
  size: string;
  amount: number;
  validUntil: string;
  note: string;
  status: OfferStatus;
  counterAmount: number;
  responseNote: string;
  createdAt: number;
  respondedAt: number | null;
  /** costo total y precio esperado del par (para mostrarle su utilidad al vendedor); 0 si el par ya no existe */
  cost: number;
  expectedPrice: number;
}

const SELECT = `SELECT o.*, u.display_name AS seller_display, u.username AS seller_username, u.email AS seller_email,
    COALESCE(i.cost + i.extra_cost, 0) AS item_cost, COALESCE(i.expected_price, 0) AS item_expected
  FROM offers o JOIN users u ON u.id = o.user_id LEFT JOIN items i ON i.id = o.item_id`;

function row(r: Record<string, unknown>): Offer {
  return {
    id: Number(r.id),
    itemId: Number(r.item_id),
    userId: Number(r.user_id),
    sellerName: String(r.seller_display || r.seller_username),
    sellerEmail: String(r.seller_email ?? ""),
    itemName: String(r.item_name),
    size: String(r.size),
    amount: Number(r.amount),
    validUntil: String(r.valid_until),
    note: String(r.note),
    status: (["aceptada", "rechazada", "contraoferta"].includes(String(r.status)) ? String(r.status) : "pendiente") as OfferStatus,
    counterAmount: Number(r.counter_amount),
    responseNote: String(r.response_note),
    createdAt: Number(r.created_at),
    respondedAt: r.responded_at === null || r.responded_at === undefined ? null : Number(r.responded_at),
    cost: Number(r.item_cost),
    expectedPrice: Number(r.item_expected),
  };
}

export async function createOffer(data: {
  itemId: number;
  userId: number;
  itemName: string;
  size: string;
  amount: number;
  validUntil: string;
  note: string;
}): Promise<number> {
  const db = await getDb();
  const res = await db.execute({
    sql: "INSERT INTO offers (item_id, user_id, item_name, size, amount, valid_until, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [data.itemId, data.userId, data.itemName, data.size, data.amount, data.validUntil, data.note, Date.now()],
  });
  return Number(res.lastInsertRowid);
}

export async function listOffers(userId: number): Promise<Offer[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: `${SELECT} WHERE o.user_id = ? ORDER BY (o.status = 'pendiente') DESC, o.created_at DESC LIMIT 100`,
    args: [userId],
  });
  return r.rows.map((x) => row(x as unknown as Record<string, unknown>));
}

export async function listAllOffers(filter: "pendiente" | "respondidas" | "todas"): Promise<Offer[]> {
  const db = await getDb();
  const where = filter === "pendiente" ? "WHERE o.status = 'pendiente'" : filter === "respondidas" ? "WHERE o.status != 'pendiente'" : "";
  const r = await db.execute(`${SELECT} ${where} ORDER BY COALESCE(o.responded_at, o.created_at) DESC LIMIT 200`);
  return r.rows.map((x) => row(x as unknown as Record<string, unknown>));
}

export async function getOffer(id: number): Promise<Offer | null> {
  const db = await getDb();
  const r = await db.execute({ sql: `${SELECT} WHERE o.id = ?`, args: [id] });
  return r.rows[0] ? row(r.rows[0] as unknown as Record<string, unknown>) : null;
}

export async function pendingOfferCount(userId: number): Promise<number> {
  try {
    const db = await getDb();
    const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM offers WHERE user_id = ? AND status = 'pendiente'", args: [userId] });
    return Number(r.rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

/** Guarda la respuesta del vendedor (solo si la oferta sigue pendiente). */
export async function saveOfferResponse(id: number, userId: number, status: Exclude<OfferStatus, "pendiente">, counterAmount: number, note: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: "UPDATE offers SET status = ?, counter_amount = ?, response_note = ?, responded_at = ? WHERE id = ? AND user_id = ? AND status = 'pendiente'",
    args: [status, counterAmount, note, Date.now(), id, userId],
  });
  return res.rowsAffected > 0;
}
