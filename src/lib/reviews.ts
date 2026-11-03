import "server-only";
import { getDb, isDbConfigured } from "@/lib/db";
import { getOrderByRef } from "@/lib/catalog-orders";
import type { Testimonial } from "@/types/testimonial";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewRow {
  id: number;
  name: string;
  email: string;
  rating: number;
  text: string;
  product: string;
  hasPhoto: boolean;
  vip: boolean;
  /** Pedido pagado del que viene la reseña ("" si llegó por el enlace abierto). */
  orderRef: string;
  status: ReviewStatus;
  createdAt: number;
}

/** Foto máxima ya reducida por el navegador (unos 150-400 KB); el servidor la limita por seguridad. */
export const MAX_PHOTO_BYTES = 700_000;

const COLS = "id, name, email, rating, text, product, photo_type, status, vip, order_ref, created_at, CASE WHEN photo != '' THEN 1 ELSE 0 END AS has_photo";

function toRow(r: Record<string, unknown>): ReviewRow {
  return {
    id: Number(r.id),
    name: String(r.name),
    email: String(r.email),
    rating: Number(r.rating),
    text: String(r.text),
    product: String(r.product),
    hasPhoto: Number(r.has_photo) === 1,
    vip: Number(r.vip) === 1,
    orderRef: String(r.order_ref ?? ""),
    status: String(r.status) as ReviewStatus,
    createdAt: Number(r.created_at),
  };
}

export async function createReview(input: {
  name: string;
  email: string;
  rating: number;
  text: string;
  product: string;
  photo?: { base64: string; type: string };
  orderRef?: string;
}): Promise<number> {
  const db = await getDb();
  const r = await db.execute({
    sql: `INSERT INTO reviews (name, email, rating, text, product, photo, photo_type, order_ref, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    args: [input.name, input.email, input.rating, input.text, input.product, input.photo?.base64 ?? "", input.photo?.type ?? "", input.orderRef ?? "", Date.now()],
  });
  return Number(r.lastInsertRowid);
}

/**
 * Datos para precargar el formulario cuando el cliente llega desde su pedido (/resena?ref=PITS-…).
 * Solo sirve para pedidos pagados; devuelve el producto y un nombre corto ("Camilo R."), nunca contacto ni dirección.
 */
export async function reviewPrefill(ref: string): Promise<{ ref: string; name: string; product: string; done: boolean } | null> {
  if (!/^PITS-[A-Z0-9]{7}$/.test(ref) || !isDbConfigured()) return null;
  try {
    const order = await getOrderByRef(ref);
    if (!order || order.status !== "pagado") return null;
    const [first, ...rest] = order.buyerName.trim().split(/\s+/);
    const initial = rest.length ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : "";
    return {
      ref: order.reference,
      name: `${first}${initial}`.slice(0, 40),
      // Modelos como "Jordan 4 …" ya traen la marca en el nombre: no se repite.
      product: `${order.brand && !order.productName.toLowerCase().startsWith(order.brand.toLowerCase()) ? order.brand + " " : ""}${order.productName}`.slice(0, 80),
      done: await orderHasReview(order.reference),
    };
  } catch (e) {
    console.error("[reseñas] no se pudo leer el pedido:", e);
    return null;
  }
}

/** ¿Ese pedido ya tiene una reseña? (una por pedido, aunque la hayan rechazado). */
export async function orderHasReview(orderRef: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT 1 FROM reviews WHERE order_ref = ? LIMIT 1", args: [orderRef] });
  return r.rows.length > 0;
}

export async function listReviews(): Promise<ReviewRow[]> {
  const db = await getDb();
  const r = await db.execute(`SELECT ${COLS} FROM reviews ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, created_at DESC`);
  return r.rows.map((x) => toRow(x as unknown as Record<string, unknown>));
}

export async function pendingReviewCount(): Promise<number> {
  const db = await getDb();
  const r = await db.execute("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'");
  return Number(r.rows[0]?.n ?? 0);
}

export async function setReviewStatus(id: number, status: ReviewStatus): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE reviews SET status = ? WHERE id = ?", args: [status, id] });
}

export async function setReviewVip(id: number, vip: boolean): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE reviews SET vip = ? WHERE id = ?", args: [vip ? 1 : 0, id] });
}

export async function deleteReview(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM reviews WHERE id = ?", args: [id] });
}

/** Reseñas aprobadas, con el mismo formato que las de testimonials.json. Sin base de datos devuelve []. */
export async function approvedTestimonials(): Promise<Testimonial[]> {
  if (!isDbConfigured()) return [];
  try {
    const db = await getDb();
    const r = await db.execute(`SELECT ${COLS} FROM reviews WHERE status = 'approved' ORDER BY created_at DESC LIMIT 60`);
    return r.rows.map((x) => {
      const row = toRow(x as unknown as Record<string, unknown>);
      return {
        id: `r${row.id}`,
        name: row.name,
        rating: Math.min(5, Math.max(1, row.rating)) as Testimonial["rating"],
        text: row.text,
        ...(row.product ? { product: row.product } : {}),
        ...(row.hasPhoto ? { photo: `/api/resenas/${row.id}/foto` } : {}),
        ...(row.vip ? { vip: true } : {}),
        date: new Date(row.createdAt).toISOString().slice(0, 10),
      };
    });
  } catch (e) {
    console.error("[reseñas] no se pudieron leer:", e);
    return [];
  }
}

export async function getReviewPhoto(id: number): Promise<{ data: Buffer; type: string; status: ReviewStatus } | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT photo, photo_type, status FROM reviews WHERE id = ? AND photo != ''", args: [id] });
  const row = r.rows[0];
  if (!row) return null;
  return { data: Buffer.from(String(row.photo), "base64"), type: String(row.photo_type), status: String(row.status) as ReviewStatus };
}
