import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import type { CatalogOrder } from "@/lib/catalog-orders";
import { shippingLine } from "@/lib/shipping-shared";
import { DIRECT_CARRIER } from "@/lib/fulfillment-shared";
import { stepsFor } from "@/lib/order-steps";

/** Página pública donde el comprador ve en qué va su pedido (solo con la referencia, sin cuenta). */
export const trackingUrl = (o: CatalogOrder) => `${siteConfig.siteUrl.replace(/\/$/, "")}/pedido/${o.reference}`;

const shipTo = (o: CatalogOrder) => shippingLine({ department: o.shipDepartment, city: o.buyerCity, address: o.shipAddress, complement: o.shipComplement });

/** Un dato dentro de un bloque [producto:] / [paso:] del correo: sin los caracteres que lo separan. */
const cell = (s: string) => s.replace(/[|\]\r\n]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Fila del par comprado, como en el seguimiento de la página: foto pequeña a la izquierda y a la derecha nombre y talla.
 * Las rutas del catálogo (/products/…) se vuelven enlaces completos para que la foto cargue en el correo.
 */
function productRow(o: CatalogOrder): string[] {
  const src = o.image.trim();
  // Las fotos del catálogo son de 2000 px (160 KB): en el correo se pide una versión de 256 px en JPEG, que pesa unos 5 KB y abre en cualquier correo.
  const img = src.startsWith("https://") ? src : src.startsWith("/") ? `${siteConfig.siteUrl.replace(/\/$/, "")}/_next/image?url=${encodeURIComponent(src)}&w=256&q=75` : "-";
  const name = `${o.brand} ${o.productName}`.trim().replace(/^(\S+) \1 /, "$1 ");
  const detail = `${o.size && o.size !== "Única" ? `Talla: ${o.size}` : "Talla única"} · ${o.condition}`;
  return [`[producto: ${cell(img)} | ${cell(name)} | ${cell(detail)}]`, ""];
}

/** "Estado del pedido": la misma línea de pasos con checks que ve el comprador en la página del pedido. */
function statusTimeline(o: CatalogOrder): string[] {
  const steps = stepsFor(o);
  const current = steps.findIndex((s) => !s.done);
  return [
    "## Estado del pedido",
    "",
    ...steps.map((s, i) => `[paso: ${s.done ? "ok" : i === current ? "actual" : "no"} | ${cell(s.title)} | ${cell(s.text)} | ${cell(s.extra ?? "")}]`),
    "",
  ];
}

/** Confirmación al comprador. */
export function buyerPaidEmail(o: CatalogOrder): { subject: string; body: string } {
  // Venta cerrada por WhatsApp: ya acordaron todo ahí, así que no se vuelve a pedir confirmar dirección ni envío.
  const manual = o.paymentMethod.startsWith("WhatsApp");
  const wa = buildGeneralWhatsAppLink(manual ? `Hola! Sobre mi pedido ${o.reference} (${o.productName}): ` : `Hola! Acabo de pagar mi pedido ${o.reference} (${o.productName}${o.size ? ` talla ${o.size}` : ""}). ¿Coordinamos el envío?`);
  return {
    subject: manual ? `Tu compra está confirmada: ${o.productName} 🔥` : `Pago recibido: ${o.productName} 🔥`,
    body: [
      manual ? "# ¡Compra ==confirmada==!" : "# ¡Pago ==recibido==!",
      "",
      `Hola ${o.buyerName.split(" ")[0]}, ya tenemos tu pago. ¡Gracias por comprar en Pitsneakers!`,
      "",
      ...productRow(o),
      ...statusTimeline(o),
      `> **Pedido:** ${o.reference}`,
      ...(manual ? [] : [`> **Total pagado:** ${formatPrice(o.amount)}${o.fee > 0 ? ` (incluye ${formatPrice(o.fee)} de costo del pago en línea)` : ""}`]),
      ...(o.discount > 0 ? [`> **Crédito aplicado:** ${formatPrice(o.discount)} (${o.creditCode})`] : []),
      "",
      ...(o.shipAddress ? [`- **Enviamos a:** ${shipTo(o)}`] : []),
      manual ? "- Te avisamos por correo en cada paso: cuando llegue a verificación, cuando esté verificado y cuando lo despachemos." : "- Un asesor te escribe por WhatsApp para confirmar tu dirección y el valor del envío.",
      "- Puedes ver en qué va tu pedido cuando quieras con el botón de abajo.",
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
      ...productRow(o),
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
      `Hola ${o.buyerName.split(" ")[0]}, tu pedido ya salió. Aquí tienes el detalle:`,
      "",
      ...productRow(o),
      ...statusTimeline(o),
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

/** Aviso al equipo (info@) de que la transportadora reportó un problema con un envío. */
export function teamShipmentIssueEmail(o: CatalogOrder, issue: string): { subject: string; body: string } {
  const wa = `https://wa.me/57${o.buyerPhone.replace(/\D/g, "").slice(-10)}`;
  return {
    subject: `⚠️ Problema con el envío ${o.reference}: ${issue}`,
    body: [
      `# Envío con ==problema==`,
      "",
      ...productRow(o),
      `> **Estado que reporta la transportadora:** ${issue}`,
      `> **Pedido:** ${o.reference}`,
      `> **Comprador:** ${o.buyerName} · ${o.buyerPhone}`,
      ...(o.carrier ? [`> **Transportadora:** ${o.carrier}${o.tracking ? ` · guía ${o.tracking}` : ""}`] : []),
      ...(o.shipAddress ? [`> **Enviado a:** ${shipTo(o)}`] : []),
      "",
      "El pedido quedó marcado como **Incidencia** en el panel. Revisa con la transportadora y avísale al comprador.",
      "",
      `[boton: Escribirle al comprador | ${wa}]`,
      `[boton: Ver pedidos | ${siteConfig.siteUrl.replace(/\/$/, "")}/admin/pedidos?f=incidencia]`,
    ].join("\n"),
  };
}

/** Correo de avance de un paso intermedio: par, línea de estado actualizada y botón al seguimiento. */
function stepEmail(o: CatalogOrder, subject: string, title: string, intro: string, bullets: string[]): { subject: string; body: string } {
  const wa = buildGeneralWhatsAppLink(`Hola! Tengo una consulta sobre mi pedido ${o.reference} (${o.productName}).`);
  return {
    subject,
    body: [
      `# ${title}`,
      "",
      `Hola ${o.buyerName.split(" ")[0]}, ${intro}`,
      "",
      ...productRow(o),
      ...statusTimeline(o),
      `> **Pedido:** ${o.reference}`,
      "",
      ...bullets.map((b) => `- ${b}`),
      "",
      `[boton: Ver el estado de mi pedido | ${trackingUrl(o)}]`,
      `[boton: Escribirnos por WhatsApp | ${wa}]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/** Aviso de que el par viene en camino a nuestro punto de verificación. */
export function buyerOnTheWayEmail(o: CatalogOrder): { subject: string; body: string } {
  return stepEmail(o, `Tu ${o.productName} va en camino a verificación`, "Tu par va ==en camino== a verificación", "tu par ya viene en camino a nuestro punto de verificación.", [
    "Cuando llegue lo revisamos a fondo antes de enviártelo.",
    "Te avisamos por correo en cada paso; también puedes verlo cuando quieras con el botón de abajo.",
  ]);
}

/** Aviso de que el par ya llegó al punto de verificación. */
export function buyerReceivedEmail(o: CatalogOrder): { subject: string; body: string } {
  return stepEmail(o, `Recibimos tu ${o.productName}`, "Ya ==recibimos== tu par", "tu par ya está en nuestro punto de verificación.", [
    "Ahora lo revisamos físicamente (autenticidad, estado y talla) y lo empacamos con protección.",
    "Cuando termine la verificación te avisamos.",
  ]);
}

/** Aviso de que el par pasó la verificación. */
export function buyerVerifiedEmail(o: CatalogOrder): { subject: string; body: string } {
  return stepEmail(o, `Tu ${o.productName} fue verificado ✅`, "Tu par fue ==verificado==", "tu par pasó nuestra verificación: autenticidad, estado y talla revisados.", [
    "Lo dejamos empacado con protección, listo para salir.",
    "En cuanto lo despachemos te mandamos la guía por correo.",
  ]);
}

/** Aviso de entrega y petición de reseña, justo cuando el cliente ya tiene el par. */
export function buyerDeliveredEmail(o: CatalogOrder): { subject: string; body: string } {
  const wa = buildGeneralWhatsAppLink(`Hola! Sobre mi pedido ${o.reference} (${o.productName}): `);
  return {
    subject: `¿Ya tienes tu ${o.productName}? Cuéntanos cómo te fue`,
    body: [
      "# Tu pedido ==llegó==",
      "",
      `Hola ${o.buyerName.split(" ")[0]}, marcamos tu pedido como entregado. ¡Disfrútalo!`,
      "",
      ...productRow(o),
      ...statusTimeline(o),
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
