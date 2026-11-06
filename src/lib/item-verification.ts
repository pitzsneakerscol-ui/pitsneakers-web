import "server-only";
import { getDb } from "@/lib/db";
import { MAX_PHOTOS, parseChecks, parseVerifResult, type SellerVerification, type VerifKey, type VerifResult } from "@/lib/verification-shared";

/** Verificación del par de un inventario con compra confirmada (ventas por fuera de la plataforma). */

/** Lo que el equipo ya registró de la verificación de cada par del vendedor (solo los que tienen algo), con los ids de sus fotos. */
export async function getItemVerifications(userId: number): Promise<Map<number, SellerVerification>> {
  const db = await getDb();
  const [items, photos] = await Promise.all([
    db.execute({
      sql: `SELECT id, verif_checks, verif_result, verif_seller_note, verif_by, verif_at FROM items
            WHERE user_id = ? AND purchase_confirmed_at IS NOT NULL`,
      args: [userId],
    }),
    db.execute({
      sql: `SELECT p.id AS id, p.item_id AS item_id FROM item_photos p JOIN items i ON i.id = p.item_id
            WHERE i.user_id = ? ORDER BY p.id`,
      args: [userId],
    }),
  ]);
  const byItem = new Map<number, number[]>();
  for (const p of photos.rows) {
    const k = Number(p.item_id);
    byItem.set(k, [...(byItem.get(k) ?? []), Number(p.id)]);
  }
  const out = new Map<number, SellerVerification>();
  for (const r of items.rows) {
    const id = Number(r.id);
    const v: SellerVerification = {
      checks: parseChecks(String(r.verif_checks ?? "")),
      result: parseVerifResult(r.verif_result),
      message: String(r.verif_seller_note ?? ""),
      by: String(r.verif_by ?? ""),
      at: r.verif_at == null ? null : Number(r.verif_at),
      photoIds: byItem.get(id) ?? [],
    };
    if (v.at !== null || v.photoIds.length > 0 || v.result !== "") out.set(id, v);
  }
  return out;
}

export async function saveItemVerification(
  itemId: number,
  input: { checks: VerifKey[]; by: string; result: VerifResult; message: string }
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE items SET verif_checks = ?, verif_result = ?, verif_seller_note = ?, verif_by = ?, verif_at = COALESCE(verif_at, ?) WHERE id = ?",
    args: [input.checks.join(","), input.result, input.message.replace(/\s+/g, " ").trim().slice(0, 400), input.by.slice(0, 40), Date.now(), itemId],
  });
}

export async function itemPhotoRoom(itemId: number): Promise<number> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM item_photos WHERE item_id = ?", args: [itemId] });
  return Math.max(0, MAX_PHOTOS - Number(r.rows[0]?.n ?? 0));
}

export async function addItemPhoto(itemId: number, mime: string, data: Uint8Array): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "INSERT INTO item_photos (item_id, mime, data, created_at) VALUES (?, ?, ?, ?)", args: [itemId, mime, data, Date.now()] });
}

export async function deleteItemPhoto(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM item_photos WHERE id = ?", args: [id] });
}

const toBytes = (raw: unknown): Uint8Array | null =>
  raw instanceof Uint8Array ? raw : raw instanceof ArrayBuffer ? new Uint8Array(raw) : null;

/** Foto de verificación (de un pedido de la web o de un par de inventario) con el id de su vendedor, para servirla solo a él y al equipo. */
export async function getVerificationPhoto(kind: "pedido" | "par", id: number): Promise<{ ownerId: number; mime: string; data: Uint8Array } | null> {
  const db = await getDb();
  const r = await db.execute(
    kind === "par"
      ? { sql: "SELECT i.user_id AS owner, p.mime AS mime, p.data AS data FROM item_photos p JOIN items i ON i.id = p.item_id WHERE p.id = ?", args: [id] }
      : { sql: "SELECT o.seller_id AS owner, p.mime AS mime, p.data AS data FROM order_photos p JOIN catalog_orders o ON o.id = p.order_id WHERE p.id = ?", args: [id] }
  );
  const row = r.rows[0];
  const data = row ? toBytes(row.data) : null;
  if (!row || !data || row.owner == null) return null;
  return { ownerId: Number(row.owner), mime: String(row.mime), data };
}
