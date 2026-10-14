import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import type { CatalogOrder } from "@/lib/catalog-orders";

const line = (o: CatalogOrder) => `**${o.brand ? o.brand + " " : ""}${o.productName}**${o.size && o.size !== "Única" ? ` · talla ${o.size}` : ""}`;

/** Confirmación al comprador. */
export function buyerPaidEmail(o: CatalogOrder): { subject: string; body: string } {
  const wa = buildGeneralWhatsAppLink(`Hola! Acabo de pagar mi pedido ${o.reference} (${o.productName}${o.size ? ` talla ${o.size}` : ""}). ¿Coordinamos el envío?`);
  return {
    subject: `Pago recibido: ${o.productName} 🔥`,
    body: [
      "# ¡Pago ==recibido==!",
      "",
      `Hola ${o.buyerName.split(" ")[0]}, ya tenemos tu pago por ${line(o)}.`,
      "",
      `> **Pedido:** ${o.reference}`,
      `> **Total pagado:** ${formatPrice(o.amount)}${o.fee > 0 ? ` (incluye ${formatPrice(o.fee)} de costo del pago en línea)` : ""}`,
      ...(o.discount > 0 ? [`> **Crédito aplicado:** ${formatPrice(o.discount)} (${o.creditCode})`] : []),
      "",
      "- Un asesor te escribe por WhatsApp para confirmar tu dirección y el valor del envío.",
      "- Cada par pasa por verificación antes de salir.",
      "",
      `[boton: Escribirnos por WhatsApp | ${wa}]`,
      "",
      "Guarda este correo: la referencia del pedido es tu comprobante.",
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/** Aviso al equipo (info@) de que entró un pago. */
export function teamPaidEmail(o: CatalogOrder, test: boolean): { subject: string; body: string } {
  const wa = `https://wa.me/57${o.buyerPhone.replace(/\D/g, "").slice(-10)}`;
  return {
    subject: `${test ? "[PRUEBA] " : ""}💰 Pedido pagado ${o.reference}: ${o.productName}`,
    body: [
      `# ${test ? "Pago de prueba" : "Nuevo pago"} ==${formatPrice(o.amount)}==`,
      "",
      line(o) + ` (${o.condition})`,
      "",
      `> **Referencia:** ${o.reference}`,
      `> **Comprador:** ${o.buyerName}`,
      `> **Correo:** ${o.buyerEmail}`,
      `> **Teléfono:** ${o.buyerPhone}`,
      `> **Ciudad:** ${o.buyerCity || "—"}`,
      `> **Medio:** ${o.paymentMethod || "—"}`,
      ...(o.discount > 0 ? [`> **Crédito de trivia aplicado:** ${formatPrice(o.discount)} (${o.creditCode})`] : []),
      "",
      "Confirma que el par sigue disponible. Si no hay stock, devuelve el pago desde el panel de Wompi.",
      "",
      `[boton: Escribirle al comprador | ${wa}]`,
      `[boton: Ver pedidos | ${siteConfig.siteUrl.replace(/\/$/, "")}/admin/pedidos]`,
    ].join("\n"),
  };
}
