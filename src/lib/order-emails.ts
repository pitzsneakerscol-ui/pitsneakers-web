import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import type { CatalogOrder } from "@/lib/catalog-orders";
import { shippingLine } from "@/lib/shipping-shared";
import { DIRECT_CARRIER } from "@/lib/fulfillment-shared";

/** Página pública donde el comprador ve en qué va su pedido (solo con la referencia, sin cuenta). */
export const trackingUrl = (o: CatalogOrder) => `${siteConfig.siteUrl.replace(/\/$/, "")}/pedido/${o.reference}`;

const shipTo = (o: CatalogOrder) => shippingLine({ department: o.shipDepartment, city: o.buyerCity, address: o.shipAddress, complement: o.shipComplement });

const line = (o: CatalogOrder) => `**${`${o.brand} ${o.productName}`.trim().replace(/^(\S+) \1 /, "$1 ")}**${o.size && o.size !== "Única" ? ` · talla ${o.size}` : ""}`;

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
      ...(o.shipAddress ? [`- **Enviamos a:** ${shipTo(o)}`] : []),
      "- Un asesor te escribe por WhatsApp para confirmar tu dirección y el valor del envío.",
      "- Cada par pasa por verificación antes de salir.",
      "- Cuando lo despachemos te mandamos la guía por correo, y puedes ver en qué va tu pedido cuando quieras.",
      "",
      `[boton: Ver el estado de mi pedido | ${trackingUrl(o)}]`,
      `[boton: Escribirnos por WhatsApp | ${wa}]`,
      "",
      "Guarda este correo: la referencia del pedido es tu comprobante.",
      "",
      "Cuando te llegue tu pedido, cuéntanos cómo te fue: toma un minuto y no necesitas crear cuenta.",
      "",
      `[boton: Dejar mi reseña | ${siteConfig.siteUrl.replace(/\/$/, "")}/resena?ref=${o.reference}]`,
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
      ...(o.shipAddress
        ? [
            `> **Enviar a:** ${shipTo(o)}`,
            ...(o.shipDocument ? [`> **Cédula:** ${o.shipDocument}`] : []),
            ...(o.shipNotes ? [`> **Indicaciones:** ${o.shipNotes}`] : []),
          ]
        : []),
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

/** Aviso al comprador de que su pedido salió, con transportadora y número de guía. */
export function buyerShippedEmail(o: CatalogOrder): { subject: string; body: string } {
  const wa = buildGeneralWhatsAppLink(`Hola! Tengo una consulta sobre mi pedido ${o.reference} (${o.productName}).`);
  const direct = o.carrier === DIRECT_CARRIER;
  return {
    subject: `Tu pedido va en camino: ${o.productName} 📦`,
    body: [
      "# Tu pedido va ==en camino==",
      "",
      `Hola ${o.buyerName.split(" ")[0]}, ya despachamos ${line(o)}.`,
      "",
      `> **Pedido:** ${o.reference}`,
      ...(o.carrier ? [`> **Transportadora:** ${o.carrier}`] : []),
      ...(!direct && o.tracking ? [`> **Número de guía:** ${o.tracking}`] : []),
      ...(o.shipAddress ? [`> **Enviado a:** ${shipTo(o)}`] : []),
      "",
      ...(direct
        ? ["- Lo entregamos directamente: te escribimos por WhatsApp para coordinar la entrega."]
        : ["- Con el número de guía puedes consultar el recorrido en la página de la transportadora.", "- Procura que haya alguien para recibirlo; las transportadoras suelen intentar la entrega más de una vez."]),
      "- Si algo no sale como esperabas, respóndenos a este correo o escríbenos por WhatsApp y lo resolvemos.",
      "",
      `[boton: Ver el estado de mi pedido | ${trackingUrl(o)}]`,
      `[boton: Escribirnos por WhatsApp | ${wa}]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/** Aviso de entrega y petición de reseña, justo cuando el cliente ya tiene el par. */
export function buyerDeliveredEmail(o: CatalogOrder): { subject: string; body: string } {
  const wa = buildGeneralWhatsAppLink(`Hola! Sobre mi pedido ${o.reference} (${o.productName}): `);
  return {
    subject: `¿Ya tienes tu ${o.productName}? Cuéntanos cómo te fue`,
    body: [
      "# Tu pedido ==llegó==",
      "",
      `Hola ${o.buyerName.split(" ")[0]}, marcamos como entregado ${line(o)}. ¡Disfrútalo!`,
      "",
      `> **Pedido:** ${o.reference}`,
      "",
      "- Si algo no está bien con tu par, escríbenos cuanto antes y lo revisamos contigo.",
      "- Si todo salió bien, tu reseña ayuda a que más gente compre con confianza. Toma un minuto y no necesitas cuenta.",
      "",
      `[boton: Dejar mi reseña | ${siteConfig.siteUrl.replace(/\/$/, "")}/resena?ref=${o.reference}]`,
      `[boton: Escribirnos por WhatsApp | ${wa}]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}
