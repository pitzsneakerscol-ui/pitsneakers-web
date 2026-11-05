import "server-only";
import { getDb } from "@/lib/db";
import { isPayoutMethod, type PayoutInfo } from "@/lib/payout-shared";

const toInfo = (r: Record<string, unknown>): PayoutInfo | null => {
  const method = String(r.method);
  if (!isPayoutMethod(method)) return null;
  return {
    method,
    bank: String(r.bank ?? ""),
    accountType: String(r.account_type ?? ""),
    accountNumber: String(r.account_number),
    holder: String(r.holder),
    document: String(r.document),
    updatedAt: Number(r.updated_at),
  };
};

/** Datos de pago de un revendedor, o null si todavía no los ha dado. */
export async function getPayoutInfo(userId: number): Promise<PayoutInfo | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM seller_payout_info WHERE user_id = ?", args: [userId] });
  return r.rows[0] ? toInfo(r.rows[0]) : null;
}

/** Datos de pago de varios revendedores a la vez (para el panel del equipo). */
export async function getPayoutInfos(userIds: number[]): Promise<Map<number, PayoutInfo>> {
  const map = new Map<number, PayoutInfo>();
  if (userIds.length === 0) return map;
  const db = await getDb();
  const r = await db.execute({ sql: `SELECT * FROM seller_payout_info WHERE user_id IN (${userIds.map(() => "?").join(",")})`, args: userIds });
  for (const row of r.rows) {
    const info = toInfo(row);
    if (info) map.set(Number(row.user_id), info);
  }
  return map;
}

export async function savePayoutInfo(userId: number, d: Omit<PayoutInfo, "updatedAt">): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO seller_payout_info (user_id, method, bank, account_type, account_number, holder, document, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET method = excluded.method, bank = excluded.bank, account_type = excluded.account_type,
            account_number = excluded.account_number, holder = excluded.holder, document = excluded.document, updated_at = excluded.updated_at`,
    args: [userId, d.method, d.bank, d.accountType, d.accountNumber, d.holder, d.document, Date.now()],
  });
}

/** Nombre a mostrar de varios revendedores (para el panel del equipo). */
export async function sellerNames(userIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (userIds.length === 0) return map;
  const db = await getDb();
  const r = await db.execute({ sql: `SELECT id, username, display_name FROM users WHERE id IN (${userIds.map(() => "?").join(",")})`, args: userIds });
  for (const row of r.rows) map.set(Number(row.id), String(row.display_name || row.username));
  return map;
}
