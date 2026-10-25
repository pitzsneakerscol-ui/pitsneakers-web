import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { MAX_BID, SNIPE_MS, maskEmail, minNextBid, unlockAt, type AuctionInfo, type AuctionItemView } from "@/lib/auction-shared";

/* ---------- Pase de la lista de espera (sesión del que puja) ---------- */

const COOKIE = "pits_pase";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export interface Bidder {
  id: number;
  email: string;
}

/** Revisa que el correo y el pase existan juntos en la lista de espera. */
export async function verifyPass(email: string, code: string): Promise<Bidder | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT id, email FROM waitlist WHERE email = ? AND code = ?", args: [email, code] });
  const row = r.rows[0];
  return row ? { id: Number(row.id), email: String(row.email) } : null;
}

export async function createBidderSession(waitlistId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM bidder_sessions WHERE expires_at < ?", args: [now] });
  await db.execute({ sql: "INSERT INTO bidder_sessions (token_hash, waitlist_id, expires_at) VALUES (?, ?, ?)", args: [sha256(token), waitlistId, now + SESSION_MS] });
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MS / 1000 });
}

export async function destroyBidderSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.execute({ sql: "DELETE FROM bidder_sessions WHERE token_hash = ?", args: [sha256(token)] });
  }
  store.delete(COOKIE);
}

export const getBidder = cache(async (): Promise<Bidder | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT w.id AS id, w.email AS email FROM bidder_sessions s JOIN waitlist w ON w.id = s.waitlist_id
          WHERE s.token_hash = ? AND s.expires_at > ?`,
    args: [sha256(token), Date.now()],
  });
  const row = r.rows[0];
  return row ? { id: Number(row.id), email: String(row.email) } : null;
});

/** Hora del servidor (las páginas no pueden llamar Date.now() directamente al renderizar). */
export const serverNow = (): number => Date.now();

/* ---------- Subasta y pares ---------- */

const toAuction = (r: Record<string, unknown>): AuctionInfo => ({
  id: Number(r.id),
  title: String(r.title),
  startsAt: Number(r.starts_at),
  endsAt: Number(r.ends_at),
  published: Number(r.published) === 1,
});

/** La subasta que ven los inscritos (la última publicada). */
export async function getPublishedAuction(): Promise<AuctionInfo | null> {
  const db = await getDb();
  const r = await db.execute("SELECT * FROM auctions WHERE published = 1 ORDER BY id DESC LIMIT 1");
  return r.rows[0] ? toAuction(r.rows[0]) : null;
}

/** La última subasta creada (borrador o publicada), para el panel del dueño. */
export async function getLatestAuction(): Promise<AuctionInfo | null> {
  const db = await getDb();
  const r = await db.execute("SELECT * FROM auctions ORDER BY id DESC LIMIT 1");
  return r.rows[0] ? toAuction(r.rows[0]) : null;
}

/** Todos los datos de los pares tal como están en la base (incluye la talla). Solo para el panel del dueño y uso interno. */
async function loadItems(auctionId: number, viewerId: number | null): Promise<(AuctionItemView & { size: string })[]> {
  const db = await getDb();
  const au = await db.execute({ sql: "SELECT starts_at FROM auctions WHERE id = ?", args: [auctionId] });
  const startsAt = Number(au.rows[0]?.starts_at ?? 0);
  const r = await db.execute({
    sql: `SELECT i.*, w.email AS leader_email FROM auction_items i LEFT JOIN waitlist w ON w.id = i.leader_id
          WHERE i.auction_id = ? ORDER BY i.position, i.id`,
    args: [auctionId],
  });
  return r.rows.map((x, i) => ({
    id: Number(x.id),
    name: String(x.name),
    brand: String(x.brand),
    size: String(x.size),
    condition: String(x.condition),
    description: String(x.description),
    image: String(x.image),
    startPrice: Number(x.start_price),
    minIncrement: Number(x.min_increment),
    currentBid: Number(x.current_bid),
    bidCount: Number(x.bid_count),
    endsAt: Number(x.ends_at),
    leader: x.leader_email ? maskEmail(String(x.leader_email)) : "",
    isLeader: viewerId !== null && x.leader_id !== null && Number(x.leader_id) === viewerId,
    locked: false,
    opensAt: unlockAt(startsAt, i),
    finale: i === r.rows.length - 1,
  }));
}

/**
 * Los pares que ven los inscritos: nunca llevan la talla, y los que todavía no se desbloquean salen en incógnito
 * (sin nombre, foto ni precio: esos datos ni siquiera salen del servidor).
 */
export async function listAuctionItems(auctionId: number, viewerId: number | null): Promise<AuctionItemView[]> {
  const now = Date.now();
  return (await loadItems(auctionId, viewerId)).map((full) => {
    const { size, ...it } = full;
    void size;
    if (it.opensAt <= now || it.endsAt <= now) return it;
    return { ...it, locked: true, name: "Par incógnito", brand: "", condition: "", description: "", image: "", startPrice: 0, minIncrement: 0, currentBid: 0, bidCount: 0, leader: "", isLeader: false };
  });
}

export type BidResult = { ok: true; prevLeaderId: number | null; endsAt: number; itemName: string } | { ok: false; error: string };

/** Registra una puja. La comparación se hace dentro de la misma sentencia SQL: dos pujas simultáneas no pueden quedar empatadas. */
export async function placeBid(itemId: number, bidderId: number, amount: number): Promise<BidResult> {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "Escribe un valor válido." };
  if (amount > MAX_BID) return { ok: false, error: "Ese valor es demasiado alto. Revisa los ceros." };
  const db = await getDb();
  const now = Date.now();
  const r = await db.execute({
    sql: `SELECT i.*, a.starts_at AS a_start, a.published AS a_pub FROM auction_items i JOIN auctions a ON a.id = i.auction_id WHERE i.id = ?`,
    args: [itemId],
  });
  const row = r.rows[0];
  if (!row || Number(row.a_pub) !== 1) return { ok: false, error: "Este par ya no está disponible." };
  if (now < Number(row.a_start)) return { ok: false, error: "La subasta todavía no empieza." };
  if (now >= Number(row.ends_at)) return { ok: false, error: "Este par ya cerró." };
  // Los pares se destapan de a uno: el lugar en la lista decide desde cuándo se puede pujar.
  const pos = Number(row.position);
  const rank = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM auction_items WHERE auction_id = ? AND (position < ? OR (position = ? AND id < ?))",
    args: [Number(row.auction_id), pos, pos, itemId],
  });
  if (now < unlockAt(Number(row.a_start), Number(rank.rows[0].n))) return { ok: false, error: "Este par todavía está en incógnito. Se desbloquea más tarde." };
  const leader = row.leader_id === null ? null : Number(row.leader_id);
  if (leader === bidderId) return { ok: false, error: "Ya vas ganando este par." };

  const item = { bidCount: Number(row.bid_count), currentBid: Number(row.current_bid), startPrice: Number(row.start_price), minIncrement: Number(row.min_increment) };
  const min = minNextBid(item);
  if (amount < min) return { ok: false, error: `La puja mínima ahora es $${min.toLocaleString("es-CO")}.` };

  const endsAt = Number(row.ends_at);
  const newEnds = endsAt - now <= SNIPE_MS ? now + SNIPE_MS : endsAt;
  const upd = await db.execute({
    sql: `UPDATE auction_items SET current_bid = ?, bid_count = bid_count + 1, leader_id = ?, ends_at = ?
          WHERE id = ? AND ends_at > ? AND ((bid_count = 0 AND start_price <= ?) OR (bid_count > 0 AND current_bid + min_increment <= ?))`,
    args: [amount, bidderId, newEnds, itemId, now, amount, amount],
  });
  if (upd.rowsAffected === 0) return { ok: false, error: "Alguien pujó justo antes que tú. Mira el valor actualizado e intenta de nuevo." };
  await db.execute({ sql: "INSERT INTO auction_bids (item_id, bidder_id, amount, created_at) VALUES (?, ?, ?, ?)", args: [itemId, bidderId, amount, now] });
  return { ok: true, prevLeaderId: leader, endsAt: newEnds, itemName: String(row.name) };
}

export async function getWaitlistEmail(id: number): Promise<string | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT email FROM waitlist WHERE id = ?", args: [id] });
  return r.rows[0] ? String(r.rows[0].email) : null;
}

/* ---------- Panel del dueño ---------- */

export interface AdminItem extends AuctionItemView {
  size: string;
  leaderEmail: string;
  winnerNotified: boolean;
}

export async function listAdminItems(auctionId: number): Promise<AdminItem[]> {
  const db = await getDb();
  const base = await loadItems(auctionId, null);
  const r = await db.execute({
    sql: `SELECT i.id AS id, w.email AS email, i.winner_notified AS wn FROM auction_items i LEFT JOIN waitlist w ON w.id = i.leader_id WHERE i.auction_id = ?`,
    args: [auctionId],
  });
  const extra = new Map(r.rows.map((x) => [Number(x.id), { email: x.email ? String(x.email) : "", wn: Number(x.wn) === 1 }]));
  return base.map((b) => ({ ...b, leaderEmail: extra.get(b.id)?.email ?? "", winnerNotified: extra.get(b.id)?.wn ?? false }));
}
