"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { getAllProducts } from "@/lib/products";
import { fromLocalInput } from "@/lib/auction-shared";
import { announceEmail, winnerEmail } from "@/lib/auction-emails";
import { prelaunch } from "@/config/prelaunch";
import type { ActionState } from "@/lib/reseller-shared";

const text = (fd: FormData, key: string, max: number): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

const money = (fd: FormData, key: string): number => {
  const digits = text(fd, key, 20).replace(/\D/g, "");
  return digits ? Math.min(Number(digits), 100_000_000) : 0;
};

const refresh = () => revalidatePath("/admin/subasta");

/** Crea o actualiza la subasta (título, fechas y si ya la ven los inscritos). */
export async function saveAuction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = text(fd, "title", 80) || "Subasta exclusiva";
  const startsAt = fromLocalInput(text(fd, "starts", 20));
  const endsAt = fromLocalInput(text(fd, "ends", 20));
  if (!startsAt || !endsAt) return { error: "Elige la fecha y hora de inicio y de cierre." };
  if (endsAt <= startsAt) return { error: "El cierre debe ser después del inicio." };
  const published = fd.get("published") === "1" ? 1 : 0;
  const id = Number(fd.get("id")) || 0;
  const db = await getDb();
  if (id) {
    await db.execute({ sql: "UPDATE auctions SET title = ?, starts_at = ?, ends_at = ?, published = ? WHERE id = ?", args: [title, startsAt, endsAt, published, id] });
    // Los pares sin pujas toman el nuevo cierre; los que ya tienen pujas nunca se acortan.
    await db.execute({ sql: "UPDATE auction_items SET ends_at = CASE WHEN bid_count = 0 THEN ? ELSE MAX(ends_at, ?) END WHERE auction_id = ?", args: [endsAt, endsAt, id] });
  } else {
    await db.execute({ sql: "INSERT INTO auctions (title, starts_at, ends_at, published, created_at) VALUES (?, ?, ?, ?, ?)", args: [title, startsAt, endsAt, published, Date.now()] });
  }
  refresh();
  return { ok: true, message: "Subasta guardada." };
}

/** Agrega un par. La foto puede ser el SKU del catálogo, un enlace https o una ruta del sitio (/products/…). */
export async function addAuctionItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const auctionId = Number(fd.get("auction_id")) || 0;
  if (!auctionId) return { error: "Primero guarda las fechas de la subasta." };
  const db = await getDb();
  const a = await db.execute({ sql: "SELECT ends_at FROM auctions WHERE id = ?", args: [auctionId] });
  if (!a.rows[0]) return { error: "No encontramos la subasta." };

  let name = text(fd, "name", 80);
  let brand = text(fd, "brand", 60);
  let size = text(fd, "size", 30);
  let image = text(fd, "image", 400);
  if (image && !/^https?:\/\//i.test(image) && !image.startsWith("/")) {
    const sku = image.toUpperCase();
    const p = (await getAllProducts()).find((x) => x.id.toUpperCase() === sku);
    if (!p) return { error: `No encontré el SKU “${image}” en el catálogo. Pega un enlace https de la foto o revisa el SKU.` };
    image = p.images[0] ?? "";
    name = name || p.name;
    brand = brand || p.brand;
    size = size || p.sizes.join(", ");
  }
  if (!name) return { error: "Escribe el nombre del par." };
  if (!image) return { error: "Falta la foto: pega un enlace https o el SKU de un par del catálogo." };
  const startPrice = money(fd, "start_price");
  if (startPrice < 10000) return { error: "Escribe el precio de salida." };
  const increment = money(fd, "increment") || 20000;
  const condition = text(fd, "condition", 10) === "usado" ? "usado" : "nuevo";

  const count = await db.execute({ sql: "SELECT COUNT(*) AS n FROM auction_items WHERE auction_id = ?", args: [auctionId] });
  await db.execute({
    sql: `INSERT INTO auction_items (auction_id, position, name, brand, size, condition, description, image, start_price, min_increment, ends_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [auctionId, Number(count.rows[0].n), name, brand, size, condition, text(fd, "description", 200), image, startPrice, increment, Number(a.rows[0].ends_at), Date.now()],
  });
  refresh();
  return { ok: true, message: `“${name}” agregado.` };
}

export async function deleteAuctionItem(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (!id) return;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM auction_bids WHERE item_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM auction_items WHERE id = ?", args: [id] });
  refresh();
}

/** Correo al ganador de un par ya cerrado, con el paso a paso para pagar. */
export async function notifyWinner(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (!id || !isEmailConfigured()) return;
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT i.name, i.size, i.current_bid, i.ends_at, w.email FROM auction_items i JOIN waitlist w ON w.id = i.leader_id WHERE i.id = ? AND i.bid_count > 0`,
    args: [id],
  });
  const row = r.rows[0];
  if (!row || Number(row.ends_at) > Date.now()) return;
  const { subject, body } = winnerEmail({ item: String(row.name), amount: Number(row.current_bid), size: String(row.size) });
  const sent = await sendEmail({ to: String(row.email), subject, body });
  if (sent.ok) await db.execute({ sql: "UPDATE auction_items SET winner_notified = 1 WHERE id = ?", args: [id] });
  refresh();
}

/** Avisa a la lista de espera que la subasta tiene fecha. Envía de a 40 (límite de Resend); vuelve a pulsar para seguir. */
export async function announceAuction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!isEmailConfigured()) return { error: "El envío de correos no está configurado." };
  const auctionId = Number(fd.get("auction_id")) || 0;
  const db = await getDb();
  const a = await db.execute({ sql: "SELECT title, starts_at, ends_at, published FROM auctions WHERE id = ?", args: [auctionId] });
  const au = a.rows[0];
  if (!au) return { error: "Primero crea la subasta." };
  if (Number(au.published) !== 1) return { error: "Publica la subasta antes de avisar (si no, no podrán ver los pares)." };
  const { subject, body } = announceEmail({ title: String(au.title), startsAt: Number(au.starts_at), endsAt: Number(au.ends_at), pairs: prelaunch.auctionPairs });
  const pending = await db.execute("SELECT id, email FROM waitlist WHERE announced = 0 ORDER BY id LIMIT 40");
  if (pending.rows.length === 0) return { ok: true, message: "Todos los inscritos ya fueron avisados." };
  let sent = 0;
  let failed = 0;
  for (const row of pending.rows) {
    const res = await sendEmail({ to: String(row.email), subject, body });
    if (res.ok) {
      sent++;
      await db.execute({ sql: "UPDATE waitlist SET announced = 1 WHERE id = ?", args: [Number(row.id)] });
    } else failed++;
    await new Promise((r) => setTimeout(r, 600));
  }
  const left = await db.execute("SELECT COUNT(*) AS n FROM waitlist WHERE announced = 0");
  refresh();
  const n = Number(left.rows[0].n);
  return { ok: failed === 0, message: `Enviados: ${sent}${failed ? ` · fallidos: ${failed}` : ""}.${n > 0 ? ` Faltan ${n}: pulsa de nuevo para seguir.` : " Ya están todos avisados."}`, ...(failed ? { error: "Algunos correos fallaron; vuelve a intentar." } : {}) };
}
