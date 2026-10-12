import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

const TTL_MS = 60 * 60 * 1000; // el enlace vale 1 hora

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea un enlace de un solo uso. En la base solo se guarda el hash: el token real viaja únicamente por correo. */
export async function createResetToken(userId: number): Promise<string> {
  const db = await getDb();
  const token = randomBytes(32).toString("hex");
  await db.execute({ sql: "DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?", args: [userId, Date.now()] });
  await db.execute({
    sql: "INSERT INTO password_resets (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    args: [hash(token), userId, Date.now() + TTL_MS, Date.now()],
  });
  return token;
}

/** Devuelve la cuenta del enlace si es válido (existe, no se usó y no venció). */
export async function findResetToken(token: string): Promise<{ userId: number; username: string; name: string } | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT p.user_id AS user_id, u.username AS username, u.display_name AS display_name, u.suspended AS suspended, u.role AS role
          FROM password_resets p JOIN users u ON u.id = p.user_id
          WHERE p.token_hash = ? AND p.used_at IS NULL AND p.expires_at > ?`,
    args: [hash(token), Date.now()],
  });
  const row = r.rows[0];
  if (!row || Number(row.suspended) === 1 || row.role === "admin") return null;
  return { userId: Number(row.user_id), username: String(row.username), name: String(row.display_name || row.username) };
}

export async function consumeResetToken(token: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE password_resets SET used_at = ? WHERE token_hash = ?", args: [Date.now(), hash(token)] });
}
