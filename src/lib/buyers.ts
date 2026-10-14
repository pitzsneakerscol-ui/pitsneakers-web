import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";

/* Cuentas de compradores: correo + contraseña o Google. Separadas de las de revendedores (cookie y tablas propias). */

const COOKIE = "pits_cuenta";
const SESSION_MS = 60 * 24 * 60 * 60 * 1000;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export interface Buyer {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  verified: boolean;
  hasPassword: boolean;
  google: boolean;
}

const toBuyer = (r: Record<string, unknown>): Buyer => ({
  id: Number(r.id),
  email: String(r.email),
  name: String(r.name),
  phone: String(r.phone),
  city: String(r.city),
  verified: Number(r.verified) === 1,
  hasPassword: String(r.password_hash) !== "",
  google: String(r.google_sub) !== "",
});

/** En local, sin correo configurado, no hay cómo verificar: se da por verificado para poder probar. */
export const autoVerify = (): boolean => !isEmailConfigured() && process.env.NODE_ENV !== "production";

export async function findBuyerByEmail(email: string): Promise<Buyer | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM buyers WHERE email = ?", args: [email] });
  return r.rows[0] ? toBuyer(r.rows[0]) : null;
}

export async function getBuyerById(id: number): Promise<Buyer | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM buyers WHERE id = ?", args: [id] });
  return r.rows[0] ? toBuyer(r.rows[0]) : null;
}

/** Crea la cuenta con contraseña. Devuelve null si el correo ya tiene cuenta. */
export async function createBuyer(opts: { email: string; name: string; password: string }): Promise<Buyer | null> {
  const db = await getDb();
  if (await findBuyerByEmail(opts.email)) return null;
  const hash = await hashPassword(opts.password);
  await db.execute({
    sql: "INSERT INTO buyers (email, name, password_hash, verified, created_at) VALUES (?,?,?,?,?)",
    args: [opts.email, opts.name, hash, autoVerify() ? 1 : 0, Date.now()],
  });
  return findBuyerByEmail(opts.email);
}

/** Revisa correo + contraseña. Tarda lo mismo si el correo no existe (evita adivinar qué correos tienen cuenta). */
export async function checkLogin(email: string, password: string): Promise<Buyer | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM buyers WHERE email = ?", args: [email] });
  const row = r.rows[0];
  const stored = row && String(row.password_hash) !== "" ? String(row.password_hash) : null;
  const ok = await verifyPassword(password, stored);
  return ok && row ? toBuyer(row) : null;
}

/** Entra con Google: crea la cuenta o la enlaza con la que ya existía con ese correo (Google ya verificó el correo). */
export async function upsertGoogleBuyer(opts: { email: string; name: string; sub: string }): Promise<Buyer> {
  const db = await getDb();
  const existing = await findBuyerByEmail(opts.email);
  if (existing) {
    await db.execute({
      sql: "UPDATE buyers SET google_sub = ?, verified = 1, name = CASE WHEN name = '' THEN ? ELSE name END WHERE id = ?",
      args: [opts.sub, opts.name, existing.id],
    });
    return (await getBuyerById(existing.id))!;
  }
  await db.execute({
    sql: "INSERT INTO buyers (email, name, google_sub, verified, created_at) VALUES (?,?,?,1,?)",
    args: [opts.email, opts.name, opts.sub, Date.now()],
  });
  return (await findBuyerByEmail(opts.email))!;
}

export async function setBuyerPassword(id: number, password: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE buyers SET password_hash = ? WHERE id = ?", args: [await hashPassword(password), id] });
}

export async function updateProfile(id: number, p: { name: string; phone: string; city: string }): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE buyers SET name = ?, phone = ?, city = ? WHERE id = ?", args: [p.name, p.phone, p.city, id] });
}

/* ---------- Sesión ---------- */

export async function createBuyerSession(buyerId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM buyer_sessions WHERE expires_at < ?", args: [now] });
  await db.execute({ sql: "INSERT INTO buyer_sessions (token_hash, buyer_id, expires_at) VALUES (?,?,?)", args: [sha256(token), buyerId, now + SESSION_MS] });
  await db.execute({ sql: "UPDATE buyers SET last_login = ? WHERE id = ?", args: [now, buyerId] });
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MS / 1000 });
}

export async function destroyBuyerSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.execute({ sql: "DELETE FROM buyer_sessions WHERE token_hash = ?", args: [sha256(token)] });
  }
  store.delete(COOKIE);
}

export const getBuyer = cache(async (): Promise<Buyer | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT b.* FROM buyer_sessions s JOIN buyers b ON b.id = s.buyer_id WHERE s.token_hash = ? AND s.expires_at > ?`,
    args: [sha256(token), Date.now()],
  });
  return r.rows[0] ? toBuyer(r.rows[0]) : null;
});

/* ---------- Enlaces de un solo uso (verificar correo / crear contraseña) ---------- */

export type TokenKind = "verify" | "reset";
const TTL: Record<TokenKind, number> = { verify: 24 * 60 * 60 * 1000, reset: 60 * 60 * 1000 };

/** Solo se guarda el hash: el token real viaja únicamente por correo. */
export async function createToken(buyerId: number, kind: TokenKind): Promise<string> {
  const db = await getDb();
  const token = randomBytes(32).toString("hex");
  await db.execute({ sql: "DELETE FROM buyer_tokens WHERE (buyer_id = ? AND kind = ?) OR expires_at < ?", args: [buyerId, kind, Date.now()] });
  await db.execute({ sql: "INSERT INTO buyer_tokens (token_hash, buyer_id, kind, expires_at) VALUES (?,?,?,?)", args: [sha256(token), buyerId, kind, Date.now() + TTL[kind]] });
  return token;
}

export async function findToken(token: string, kind: TokenKind): Promise<Buyer | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT b.* FROM buyer_tokens t JOIN buyers b ON b.id = t.buyer_id
          WHERE t.token_hash = ? AND t.kind = ? AND t.used_at IS NULL AND t.expires_at > ?`,
    args: [sha256(token), kind, Date.now()],
  });
  return r.rows[0] ? toBuyer(r.rows[0]) : null;
}

export async function consumeToken(token: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE buyer_tokens SET used_at = ? WHERE token_hash = ?", args: [Date.now(), sha256(token)] });
}

export async function markVerified(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE buyers SET verified = 1 WHERE id = ?", args: [id] });
}

/* ---------- Favoritos / lista de deseos ---------- */

export async function listFavoriteSlugs(buyerId: number): Promise<string[]> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT slug FROM buyer_favorites WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 200", args: [buyerId] });
  return r.rows.map((x) => String(x.slug));
}

export async function setFavorite(buyerId: number, slug: string, on: boolean): Promise<void> {
  const db = await getDb();
  if (on) await db.execute({ sql: "INSERT OR IGNORE INTO buyer_favorites (buyer_id, slug, created_at) VALUES (?,?,?)", args: [buyerId, slug, Date.now()] });
  else await db.execute({ sql: "DELETE FROM buyer_favorites WHERE buyer_id = ? AND slug = ?", args: [buyerId, slug] });
}

/* ---------- Pares agregados a mano a la colección ---------- */

export interface ManualPair {
  id: number;
  name: string;
  brand: string;
  size: string;
  paid: number;
  createdAt: number;
}

export async function listManualPairs(buyerId: number): Promise<ManualPair[]> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM buyer_collection WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 300", args: [buyerId] });
  return r.rows.map((x) => ({ id: Number(x.id), name: String(x.name), brand: String(x.brand), size: String(x.size), paid: Number(x.paid), createdAt: Number(x.created_at) }));
}

export async function addManualPair(buyerId: number, p: { name: string; brand: string; size: string; paid: number }): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "INSERT INTO buyer_collection (buyer_id, name, brand, size, paid, created_at) VALUES (?,?,?,?,?,?)", args: [buyerId, p.name, p.brand, p.size, p.paid, Date.now()] });
}

export async function removeManualPair(buyerId: number, id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM buyer_collection WHERE id = ? AND buyer_id = ?", args: [id, buyerId] });
}

export async function listBuyersForAdmin(): Promise<{ count: number; verified: number }> {
  const db = await getDb();
  const r = await db.execute("SELECT COUNT(*) AS n, COALESCE(SUM(verified),0) AS v FROM buyers");
  return { count: Number(r.rows[0].n), verified: Number(r.rows[0].v) };
}
