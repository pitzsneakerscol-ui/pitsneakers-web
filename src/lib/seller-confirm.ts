import "server-only";
import { getDb } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { createNotification } from "@/lib/notifications";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { formatPrice } from "@/lib/format";
import { sellerRules, verificationPointLines } from "@/lib/seller-confirm-shared";
import type { CatalogOrder } from "@/lib/catalog-orders";

export type ConfirmResult = "sent" | "no-email" | "off" | "fail" | "skipped";

const orderName = (o: CatalogOrder) => `${o.brand} ${o.productName}`.trim().replace(/^(\S+) \1 /, "$1 ");

/** Correo de confirmación: dónde dejar el par y las reglas. Mismo lenguaje de marcas que los demás correos. */
function confirmEmail(o: CatalogOrder, firstName: string): { subject: string; body: string } {
  const name = orderName(o);
  const detail = `${o.size && o.size !== "Única" ? `Talla: ${o.size}` : "Talla única"} · ${o.condition}`;
  const src = o.image.trim();
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const img = src.startsWith("https://") ? src : src.startsWith("/") ? `${base}/_next/image?url=${encodeURIComponent(src)}&w=256&q=75` : "-";
  const clean = (s: string) => s.replace(/[|\]\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return {
    subject: `Vendiste tu ${name}: llévalo a verificación 🔥`,
    body: [
      "# ¡Venta ==confirmada==!",
      "",
      `Hola ${firstName}, el cliente ya pagó tu par y confirmamos la venta. Ahora déjalo en nuestro punto de verificación.`,
      "",
      `[producto: ${clean(img)} | ${clean(name)} | ${clean(detail)}]`,
      "",
      `Recibes ${formatPrice(o.payoutAmount)} cuando el par pase todo el proceso de verificación.`,
      "",
      `## Dónde dejarlo`,
      "",
      ...verificationPointLines().map((l) => `> **${l}**`),
      "",
      "## Ten en cuenta",
      "",
      ...sellerRules().map((r) => `- ${r}`),
      "",
      `[boton: Ver mis pedidos | ${base}/revendedores/pedidos]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/**
 * Le confirma el pedido al revendedor dueño del par: aviso en el panel (campana, celular y navegador) y, si se pide, un correo
 * con la dirección del punto de verificación y las reglas. Nunca lanza error.
 */
export async function confirmOrderToSeller(order: CatalogOrder, opts: { email: boolean }): Promise<ConfirmResult> {
  try {
    if (!order.sellerId) return "skipped";
    const point = siteConfig.verificationPoint;
    await createNotification(order.sellerId, {
      kind: "info",
      title: `Confirmamos tu venta: ${orderName(order)}`,
      body: `Déjalo en nuestro punto de verificación en ${point.city}: ${point.lines[2]}. El envío debe llegar pago.`,
      href: "/revendedores/pedidos",
    });
    if (!opts.email) return "skipped";
    const db = await getDb();
    const u = await db.execute({ sql: "SELECT username, display_name, email FROM users WHERE id = ?", args: [order.sellerId] });
    const row = u.rows[0];
    const to = row ? String(row.email ?? "") : "";
    if (!to) return "no-email";
    if (!isEmailConfigured()) return "off";
    const first = String(row.display_name || row.username).split(" ")[0];
    const { subject, body } = confirmEmail(order, first);
    const res = await sendEmail({ to, subject, body });
    return res.ok ? "sent" : "fail";
  } catch (e) {
    console.error("[pedidos] confirmar al revendedor:", e);
    return "fail";
  }
}
