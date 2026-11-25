import "server-only";
import type { InValue } from "@libsql/client";
import { getDb } from "@/lib/db";
import { sniffImage } from "@/lib/item-delivery";
import type { NewItemData } from "@/lib/reseller";
import { USED_MAX_PHOTOS, USED_MIN_PHOTOS } from "@/lib/used-shared";

/**
 * Pares usados que sube un revendedor: quedan "pendiente" con sus fotos reales hasta que el dueño las revisa.
 * Solo los aprobados salen en la web (los publica "Actualizar catálogo", con esas fotos y marcados como usados).
 */

export type ReviewStatus = "pendiente" | "aprobado" | "rechazado";

/** Cada foto ya viene reducida del navegador (unos 150-400 KB); el servidor la limita por seguridad. */
export const USED_MAX_PHOTO_BYTES = 700_000;

export interface UsedPhotoInput {
  mime: string;
  data: Uint8Array;
}

/** Lee y valida las fotos de un formulario (campo "photos"). Devuelve las fotos o el mensaje de error. */
export async function readUsedPhotos(fd: FormData): Promise<{ photos: UsedPhotoInput[] } | { error: string }> {
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length < USED_MIN_PHOTOS) return { error: `Un par usado necesita al menos ${USED_MIN_PHOTOS} fotos reales (de lado, la suela y el talón).` };
  if (files.length > USED_MAX_PHOTOS) return { error: `Máximo ${USED_MAX_PHOTOS} fotos por par.` };
  const photos: UsedPhotoInput[] = [];
  for (const f of files) {
    if (f.size > USED_MAX_PHOTO_BYTES) return { error: "Una de las fotos pesa demasiado. Prueba con otra o sácala con menos resolución." };
    const data = new Uint8Array(await f.arrayBuffer());
    const mime = sniffImage(data);
    if (!mime) return { error: "Las fotos deben ser JPG, PNG o WebP." };
    photos.push({ mime, data });
  }
  return { photos };
}

/** Guarda un par usado (una sola unidad) en revisión, con sus fotos. Devuelve el id del par. */
export async function insertUsedItem(userId: number, data: NewItemData, size: string, photos: UsedPhotoInput[]): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.execute({
    sql: `INSERT INTO items
      (user_id, brand, name, colorway, sku, size, condition, cost, extra_cost,
       expected_price, status, purchase_date, source, notes, image_url,
       catalog_slug, kind, created_at, review_status)
      VALUES (?, ?, ?, ?, ?, ?, 'usado', ?, ?, ?, 'stock', ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    args: [
      userId,
      data.brand,
      data.name,
      data.colorway,
      data.sku,
      size,
      data.cost,
      data.extraCost,
      data.expectedPrice,
      data.purchaseDate,
      data.source,
      data.notes,
      data.imageUrl,
      data.catalogSlug,
      data.kind,
      now,
    ] as InValue[],
  });
  const itemId = Number(res.lastInsertRowid);
  await db.batch(
    photos.map((p, i) => ({
      sql: "INSERT INTO used_photos (item_id, mime, data, created_at) VALUES (?, ?, ?, ?)",
      args: [itemId, p.mime, p.data, now + i] as InValue[],
    })),
    "write"
  );
  return itemId;
}

/** Foto de un par usado y de quién es (para servirla: pública si el par está aprobado; si no, solo su dueño o el equipo). */
export async function getUsedPhoto(photoId: number): Promise<{ userId: number; status: ReviewStatus; mime: string; data: Uint8Array } | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT i.user_id AS user_id, i.review_status AS status, i.status AS item_status, p.mime AS mime, p.data AS data
          FROM used_photos p JOIN items i ON i.id = p.item_id WHERE p.id = ?`,
    args: [photoId],
  });
  const row = r.rows[0];
  if (!row) return null;
  const raw = row.data as unknown;
  const data = raw instanceof Uint8Array ? raw : raw instanceof ArrayBuffer ? new Uint8Array(raw) : null;
  if (!data) return null;
  return { userId: Number(row.user_id), status: String(row.status) as ReviewStatus, mime: String(row.mime), data };
}

/** Ids de las fotos de varios pares usados: "id del par" -> ids de foto, en el orden en que se subieron. */
export async function usedPhotoIds(itemIds: number[]): Promise<Map<number, number[]>> {
  const out = new Map<number, number[]>();
  if (itemIds.length === 0) return out;
  const db = await getDb();
  const res = await db.execute({ sql: `SELECT id, item_id FROM used_photos WHERE item_id IN (${itemIds.map(() => "?").join(",")}) ORDER BY id`, args: itemIds as InValue[] });
  for (const r of res.rows) {
    const k = Number(r.item_id);
    out.set(k, [...(out.get(k) ?? []), Number(r.id)]);
  }
  return out;
}

export interface UsedReviewRow {
  id: number;
  userId: number;
  sellerName: string;
  name: string;
  brand: string;
  colorway: string;
  catalogSlug: string;
  size: string;
  price: number;
  notes: string;
  status: ReviewStatus;
  reviewNote: string;
  photoIds: number[];
  createdAt: number;
  reviewedAt: number | null;
}

/** Pares usados para revisar: los pendientes primero (más antiguos primero) y, después, los últimos revisados. */
export async function listUsedForReview(recentLimit = 20): Promise<{ pending: UsedReviewRow[]; recent: UsedReviewRow[] }> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT i.id, i.user_id, COALESCE(NULLIF(u.display_name, ''), u.username) AS seller, i.name, i.brand, i.colorway, i.catalog_slug,
                 i.size, i.expected_price, i.notes, i.review_status, i.review_note, i.created_at, i.reviewed_at
          FROM items i JOIN users u ON u.id = i.user_id
          WHERE i.condition = 'usado' AND (i.review_status != 'aprobado' OR i.reviewed_at IS NOT NULL)
          ORDER BY CASE i.review_status WHEN 'pendiente' THEN 0 ELSE 1 END, CASE i.review_status WHEN 'pendiente' THEN i.created_at END ASC, i.reviewed_at DESC`,
    args: [],
  });
  const ids = res.rows.map((r) => Number(r.id));
  const photos = await usedPhotoIds(ids);
  const rows: UsedReviewRow[] = res.rows.map((r) => ({
    id: Number(r.id),
    userId: Number(r.user_id),
    sellerName: String(r.seller),
    name: String(r.name),
    brand: String(r.brand),
    colorway: String(r.colorway ?? ""),
    catalogSlug: String(r.catalog_slug),
    size: String(r.size),
    price: Number(r.expected_price),
    notes: String(r.notes),
    status: String(r.review_status) as ReviewStatus,
    reviewNote: String(r.review_note ?? ""),
    photoIds: photos.get(Number(r.id)) ?? [],
    createdAt: Number(r.created_at),
    reviewedAt: r.reviewed_at == null ? null : Number(r.reviewed_at),
  }));
  return { pending: rows.filter((r) => r.status === "pendiente"), recent: rows.filter((r) => r.status !== "pendiente").slice(0, recentLimit) };
}

export async function usedPendingCount(): Promise<number> {
  const db = await getDb();
  const r = await db.execute("SELECT COUNT(*) AS n FROM items WHERE condition = 'usado' AND review_status = 'pendiente' AND status != 'vendido'");
  return Number(r.rows[0]?.n ?? 0);
}

/** El dueño aprueba o rechaza un par usado. Devuelve el par (para avisarle a su vendedor) o null si ya no estaba pendiente. */
export async function reviewUsedItem(
  itemId: number,
  decision: "aprobado" | "rechazado",
  note: string
): Promise<{ userId: number; name: string; size: string } | null> {
  const db = await getDb();
  const upd = await db.execute({
    sql: "UPDATE items SET review_status = ?, review_note = ?, reviewed_at = ? WHERE id = ? AND condition = 'usado' AND review_status = 'pendiente'",
    args: [decision, note, Date.now(), itemId],
  });
  if (upd.rowsAffected === 0) return null;
  const r = await db.execute({ sql: "SELECT user_id, name, size FROM items WHERE id = ?", args: [itemId] });
  const row = r.rows[0];
  return row ? { userId: Number(row.user_id), name: String(row.name), size: String(row.size ?? "") } : null;
}
