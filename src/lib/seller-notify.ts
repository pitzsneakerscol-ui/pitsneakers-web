import "server-only";
import { getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { inventoryEmail } from "@/lib/admin-shared";
import { siteConfig } from "@/config/site";
import { kindsPhrase, type ItemKind } from "@/lib/reseller-shared";

export type NotifyResult = "sent" | "no-email" | "off" | "fail";

/**
 * Aviso automático por correo: se le cargaron pares al inventario de un vendedor.
 * "sent" = enviado · "no-email" = no tiene correo registrado · "off" = correo sin configurar o nada que avisar · "fail" = falló el envío.
 */
export async function notifyInventory(
  userId: number,
  items: { name: string; size: string; price: number; kind?: ItemKind }[]
): Promise<NotifyResult> {
  if (items.length === 0) return "off";
  // Aviso dentro del panel (la campana), aunque no tenga correo.
  const names = [...new Set(items.map((i) => i.name))];
  await createNotification(userId, {
    kind: "inventario",
    title: `${items.length === 1 ? "Se cargó" : "Se cargaron"} ${kindsPhrase(items)} en tu inventario`,
    body: names.slice(0, 3).join(", ") + (names.length > 3 ? ` y ${names.length - 3} más` : ""),
    href: "/revendedores/inventario",
  });
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
