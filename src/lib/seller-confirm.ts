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

const clean = (s: string) => s.replace(/[|\]\r\n]+/g, " ").replace(/\s+/g, " ").trim();

/** Foto del par para la tarjeta del correo ("-" si no hay una que se pueda mostrar). */
function emailImage(src: string): string {
  const s = src.trim();
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  return s.startsWith("https://") ? s : s.startsWith("/") ? `${base}/_next/image?url=${encodeURIComponent(s)}&w=256&q=75` : "-";
}

/** Correo de confirmación: dónde dejar el par y las reglas. Mismo lenguaje de marcas que los demás correos. */
function confirmEmail(o: CatalogOrder, firstName: string): { subject: string; body: string } {
  const name = orderName(o);
  const detail = `${o.size && o.size !== "Única" ? `Talla: ${o.size}` : "Talla única"} · ${o.condition}`;
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const img = emailImage(o.image);
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

export interface PurchaseConfirm {
  /** Nombre del par tal como se lo mostramos (con marca). */
  name: string;
  size: string;
  imageUrl: string;
  /** Lo que le pagamos por el par. */
  amount: number;
  note: string;
}

/** Correo de compra confirmada: el precio pactado, dónde dejar el par y las reglas. */
function purchaseEmail(p: PurchaseConfirm, firstName: string): { subject: string; body: string } {
  const price = formatPrice(p.amount);
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const detail = p.size ? `Talla: ${p.size}` : "Talla única";
  return {
    subject: `Confirmamos la compra de tu ${p.name}: ${price} 🔥`,
    body: [
      "# ¡Compra ==confirmada==!",
      "",
      `Hola ${firstName}, confirmamos la compra de tu par por **${price}**. Ahora déjalo en nuestro punto de verificación.`,
      "",
      `[producto: ${clean(emailImage(p.imageUrl))} | ${clean(p.name)} | ${clean(detail)}]`,
      "",
      ...(p.note ? [`> **Comentario:** ${p.note}`, ""] : []),
      `Te pagamos ${price} cuando el par pase todo el proceso de verificación.`,
      "",
      "## Dónde dejarlo",
      "",
      ...verificationPointLines().map((l) => `> **${l}**`),
      "",
      "## Ten en cuenta",
      "",
      ...sellerRules().map((r) => `- ${r}`),
      "",
      `[boton: Ver mi inventario | ${base}/revendedores/inventario]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/**
 * El dueño le confirma al revendedor la compra de un par de su inventario, con el precio pactado: aviso en el panel
 * (campana, celular y navegador) con la dirección del punto de verificación y, si se pide, un correo con la dirección y las reglas.
 * Nunca lanza error.
 */
export async function confirmPurchaseToSeller(userId: number, p: PurchaseConfirm, opts: { email: boolean }): Promise<ConfirmResult> {
  try {
    const point = siteConfig.verificationPoint;
    const price = formatPrice(p.amount);
    await createNotification(userId, {
      kind: "inventario",
      title: `Confirmamos la compra de tu ${p.name}: ${price}`,
      body: `${p.size ? `Talla ${p.size}. ` : ""}Déjalo en nuestro punto de verificación en ${point.city}: ${point.lines[2]}. El envío debe llegar pago.${p.note ? ` ${p.note}` : ""}`,
      href: "/revendedores/inventario",
    });
    if (!opts.email) return "skipped";
    const db = await getDb();
    const u = await db.execute({ sql: "SELECT username, display_name, email FROM users WHERE id = ?", args: [userId] });
    const row = u.rows[0];
    const to = row ? String(row.email ?? "") : "";
    if (!to) return "no-email";
    if (!isEmailConfigured()) return "off";
    const who = String(row.display_name || row.username);
    const { subject, body } = purchaseEmail(p, who.split(" ")[0]);
    const res = await sendEmail({ to, subject, body });
    await db.execute({
      sql: "INSERT INTO email_log (to_email, to_name, subject, body, template, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [to, who, subject, body, "compra_confirmada", res.ok ? "enviado" : "fallido", res.ok ? "" : res.error, Date.now()],
    });
    return res.ok ? "sent" : "fail";
  } catch (e) {
    console.error("[inventario] confirmar compra al revendedor:", e);
    return "fail";
  }
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
