import { getBidder } from "@/lib/auction";
import { clientIp, getCurrentUser, rateLimitHit } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/** La app móvil registra aquí el código (token) del celular para poder mandarle avisos. Si hay sesión, se liga a la persona. */
export async function POST(request: Request) {
  if (!isDbConfigured()) return Response.json({ ok: false }, { status: 503 });
  let body: { token?: unknown; platform?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform = body.platform === "ios" ? "ios" : "android";
  if (token.length < 20 || token.length > 400) return Response.json({ ok: false }, { status: 400 });
  if (!(await rateLimitHit(`device:${await clientIp()}`, 30, 60 * 60 * 1000))) return Response.json({ ok: false }, { status: 429 });

  const [user, bidder] = await Promise.all([getCurrentUser(), getBidder()]);
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO devices (token, platform, user_id, waitlist_id, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(token) DO UPDATE SET platform = excluded.platform, last_seen = excluded.last_seen,
            user_id = COALESCE(excluded.user_id, devices.user_id), waitlist_id = COALESCE(excluded.waitlist_id, devices.waitlist_id)`,
    args: [token, platform, user && !user.isAdmin ? user.id : null, bidder?.id ?? null, Date.now(), Date.now()],
  });
  return Response.json({ ok: true });
}
