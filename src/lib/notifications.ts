import "server-only";
import { getDb } from "@/lib/db";
import { sendPush } from "@/lib/push";

export type NotificationKind = "inventario" | "consulta" | "info";

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: number;
}

/**
 * Crea un aviso para el vendedor: queda en la campana del panel y, además, le llega como aviso al celular
 * si tiene la app instalada con los avisos activados (así no depende solo del correo).
 * Nunca debe romper la acción que lo origina.
 */
export async function createNotification(
  userId: number,
  data: { kind?: NotificationKind; title: string; body?: string; href?: string }
): Promise<void> {
  try {
    const db = await getDb();
    await db.execute({
      sql: "INSERT INTO notifications (user_id, kind, title, body, href, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [userId, data.kind ?? "info", data.title.slice(0, 120), (data.body ?? "").slice(0, 400), data.href ?? "", Date.now()],
    });
  } catch (e) {
    console.error("[notifications] no se pudo crear el aviso:", e);
    return;
  }
  // sendPush no lanza errores y no hace nada si los avisos al celular no están configurados.
  await sendPush(
    { userIds: [userId] },
    { title: data.title, body: data.body?.trim() || "Toca para verlo en tu panel.", url: data.href || "/revendedores/avisos" }
  );
}

export async function unreadCount(userId: number): Promise<number> {
  try {
    const db = await getDb();
    const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", args: [userId] });
    return Number(r.rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function listNotifications(userId: number, limit = 50): Promise<AppNotification[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT id, kind, title, body, href, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
    args: [userId, limit],
  });
  return r.rows.map((x) => ({
    id: Number(x.id),
    kind: (["inventario", "consulta"].includes(String(x.kind)) ? String(x.kind) : "info") as NotificationKind,
    title: String(x.title),
    body: String(x.body),
    href: String(x.href),
    read: x.read_at !== null,
    createdAt: Number(x.created_at),
  }));
}

export async function markAllRead(userId: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", args: [Date.now(), userId] });
}
