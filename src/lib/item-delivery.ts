import "server-only";
import { getDb } from "@/lib/db";

export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Tipo real de la imagen según sus primeros bytes (no confiamos en lo que declara el navegador). */
export function sniffImage(b: Uint8Array): (typeof PROOF_TYPES)[number] | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export interface DeliveredItem {
  name: string;
  brand: string;
  size: string;
}

/**
 * El revendedor avisa que ya dejó (o envió) un par con compra confirmada, con la foto de prueba.
 * Solo cuenta si el par es suyo, la compra está confirmada y todavía no lo había avisado. Devuelve el par, o null si no aplica.
 */
export async function saveItemDelivery(
  userId: number,
  itemId: number,
  d: { delivery: "dropoff" | "envio"; tracking: string; mime: string; data: Uint8Array }
): Promise<DeliveredItem | null> {
  const db = await getDb();
  const now = Date.now();
  const upd = await db.execute({
    sql: `UPDATE items SET purchase_dropped_at = ?, purchase_delivery = ?, purchase_tracking = ?
          WHERE id = ? AND user_id = ? AND purchase_confirmed_at IS NOT NULL AND purchase_dropped_at IS NULL AND status != 'vendido'`,
    args: [now, d.delivery, d.tracking, itemId, userId],
  });
  if (upd.rowsAffected === 0) return null;
  await db.execute({
    sql: `INSERT INTO item_proofs (item_id, mime, data, created_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(item_id) DO UPDATE SET mime = excluded.mime, data = excluded.data, created_at = excluded.created_at`,
    args: [itemId, d.mime, d.data, now],
  });
  const r = await db.execute({ sql: "SELECT name, brand, size FROM items WHERE id = ?", args: [itemId] });
  const row = r.rows[0];
  return row ? { name: String(row.name), brand: String(row.brand ?? ""), size: String(row.size ?? "") } : null;
}

/** Foto de prueba de un par y de quién es (para servirla solo al dueño o al equipo). */
export async function getItemProof(itemId: number): Promise<{ userId: number; mime: string; data: Uint8Array } | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT i.user_id AS user_id, p.mime AS mime, p.data AS data FROM item_proofs p JOIN items i ON i.id = p.item_id WHERE p.item_id = ?",
    args: [itemId],
  });
  const row = r.rows[0];
  if (!row) return null;
  const raw = row.data as unknown;
  const data = raw instanceof Uint8Array ? raw : raw instanceof ArrayBuffer ? new Uint8Array(raw) : null;
  if (!data) return null;
  return { userId: Number(row.user_id), mime: String(row.mime), data };
}
