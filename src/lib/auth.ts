import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { getDb } from "@/lib/db";

const COOKIE = "rv_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const SCRYPT_N = 16384;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, 64, { N: SCRYPT_N, r: 8, p: 1 }, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${SCRYPT_N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

// Hash falso para que la verificación tarde igual cuando el usuario no existe.
const DUMMY_HASH = `scrypt$${SCRYPT_N}$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;

export async function verifyPassword(
  password: string,
  stored: string | null
): Promise<boolean> {
  const parts = (stored ?? DUMMY_HASH).split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  const actual = await scrypt(password, salt);
  const match =
    actual.length === expected.length && timingSafeEqual(actual, expected);
  return stored !== null && match;
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM sessions WHERE expires_at < ?",
    args: [now],
  });
  await db.execute({
    sql: "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    args: [sha256(token), userId, now + SESSION_MS, now],
  });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.execute({
      sql: "DELETE FROM sessions WHERE id = ?",
      args: [sha256(token)],
    });
  }
  store.delete(COOKIE);
}

export async function destroyOtherSessions(userId: number): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM sessions WHERE user_id = ? AND id != ?",
    args: [userId, token ? sha256(token) : ""],
  });
}

export interface CurrentUser {
  id: number;
  username: string;
  displayName: string;
  whatsapp: string;
  email: string;
  isAdmin: boolean;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT u.id, u.username, u.display_name, u.whatsapp, u.email, u.role
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = ? AND s.expires_at > ? AND u.suspended = 0`,
    args: [sha256(token), Date.now()],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    whatsapp: String(row.whatsapp),
    email: String(row.email),
    isAdmin: row.role === "admin" && String(row.username) === adminUsername(),
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/revendedores");
  return user;
}

/** Solo el dueño (cuenta definida por ADMIN_USERNAME / ADMIN_PASSWORD). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/revendedores");
  return user;
}

/* ---------- Cuenta del dueño (variables de entorno) ---------- */

export function adminUsername(): string {
  const name = (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();
  return process.env.ADMIN_PASSWORD && /^[a-z0-9._-]{3,24}$/.test(name) ? name : "";
}

const RESERVED = ["admin", "administrador", "root", "soporte", "pitsneakers", "pitzsneakers"];

export function isReservedUsername(username: string): boolean {
  const u = username.toLowerCase();
  return u === adminUsername() || RESERVED.includes(u);
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (expected.length < 10) return false;
  const a = createHash("sha256").update(password).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/* ---------- Límite de intentos ---------- */

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconocida"
  );
}

/** Registra un intento y dice si todavía está dentro del límite. */
export async function rateLimitHit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.execute({
    sql: "SELECT count, reset_at FROM rate_limits WHERE key = ?",
    args: [key],
  });
  const row = res.rows[0];
  if (!row || Number(row.reset_at) < now) {
    await db.execute({
      sql: "INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)",
      args: [key, now + windowMs],
    });
    return true;
  }
  if (Number(row.count) >= limit) return false;
  await db.execute({
    sql: "UPDATE rate_limits SET count = count + 1 WHERE key = ?",
    args: [key],
  });
  return true;
}

export async function rateLimitBlocked(
  key: string,
  limit: number
): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT count, reset_at FROM rate_limits WHERE key = ?",
    args: [key],
  });
  const row = res.rows[0];
  return Boolean(
    row && Number(row.reset_at) >= Date.now() && Number(row.count) >= limit
  );
}

export async function rateLimitClear(key: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM rate_limits WHERE key = ?", args: [key] });
}
