import "server-only";
import { getDb } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { inventoryEmail } from "@/lib/admin-shared";
import { siteConfig } from "@/config/site";

export type NotifyResult = "sent" | "no-email" | "off" | "fail";

/**
 * Aviso automático por correo: se le cargaron pares al inventario de un vendedor.
 * "sent" = enviado · "no-email" = no tiene correo registrado · "off" = correo sin configurar o nada que avisar · "fail" = falló el envío.
 */
export async function notifyInventory(
  userId: number,
  items: { name: string; size: string; price: number }[]
): Promise<NotifyResult> {
  if (items.length === 0) return "off";
  const db = await getDb();
  const u = await db.execute({ sql: "SELECT username, display_name, email FROM users WHERE id = ?", args: [userId] });
  const row = u.rows[0];
  const to = row ? String(row.email ?? "") : "";
  if (!to) return "no-email";
  if (!isEmailConfigured()) return "off";
  const { subject, body } = inventoryEmail({
    name: String(row.display_name || row.username),
    items,
    siteUrl: siteConfig.siteUrl,
  });
  const res = await sendEmail({ to, subject, body });
  return res.ok ? "sent" : "fail";
}
