import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import type { BuyerOffer } from "@/lib/buyer-offers";

const site = () => siteConfig.siteUrl.replace(/\/$/, "");
const first = (n: string) => n.trim().split(" ")[0] || "";
const pair = (o: BuyerOffer) => `**${o.brand ? o.brand + " " : ""}${o.productName}**${o.size && o.size !== "Única" ? ` · talla ${o.size}` : ""}`;
const hours = (h: number) => `${h} horas`;

/** Correo para confirmar que el correo es de quien se registró. */
export function verifyEmail(opts: { name: string; url: string }): { subject: string; body: string } {
  return {
    subject: "Confirma tu correo en Pitsneakers",
    body: [
      "# Confirma tu ==correo==",
      "",
      `Hola ${first(opts.name) || "👋"}, ya casi tienes tu cuenta de Pitsneakers.`,
      "",
      "Con ella puedes hacer ofertas, guardar tu lista de deseos y ver tu colección con el valor aproximado de tus pares.",
      "",
      `[boton: Confirmar mi correo | ${opts.url}]`,
      "",
      "El enlace vale **24 horas**. Si no creaste esta cuenta, ignora este correo.",
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

export function buyerResetEmail(opts: { name: string; url: string }): { subject: string; body: string } {
  return {
    subject: "Restablece tu contraseña de Pitsneakers",
    body: [
      "# Crea tu ==nueva contraseña==",
      "",
      `Hola ${first(opts.name) || "👋"},`,
      "",
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta de Pitsneakers.",
      "",
      `[boton: Crear nueva contraseña | ${opts.url}]`,
      "",
      "Este enlace funciona **una sola vez** y vence en **1 hora**. Si tú no lo pediste, ignora este correo: tu contraseña sigue igual.",
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/** Aviso al equipo: llegó una oferta nueva. */
export function offerToTeamEmail(o: BuyerOffer): { subject: string; body: string } {
  return {
    subject: `${o.priority ? "⭐ " : ""}🏷️ Oferta nueva: ${formatPrice(o.amount)} por ${o.productName}`,
    body: [
      `# Oferta de ==${formatPrice(o.amount)}==`,
      "",
      `${pair(o)} · precio publicado ${formatPrice(o.listPrice)}`,
      "",
      `> **Comprador:** ${o.buyerName || "—"} (${o.buyerEmail})${o.league ? ` · liga ${o.league}${o.priority ? " (respuesta prioritaria)" : ""}` : ""}`,
      `> **Oferta:** ${formatPrice(o.amount)} (${Math.round((o.amount / o.listPrice) * 100)}% del precio)`,
      `> **Responder antes de:** ${new Date(o.expiresAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}`,
      "",
      `[boton: Responder oferta | ${site()}/admin/ofertas-clientes]`,
    ].join("\n"),
  };
}

export function offerAcceptedEmail(o: BuyerOffer): { subject: string; body: string } {
  return {
    subject: `¡Aceptamos tu oferta por ${o.productName}! 🔥`,
    body: [
      "# ¡Oferta ==aceptada==!",
      "",
      `Hola ${first(o.buyerName)}, aceptamos tu oferta de ${formatPrice(o.agreedAmount || o.amount)} por ${pair(o)}.`,
      "",
      `Tienes **${hours(o.payHours)}** para pagarla. Después de ese plazo el par vuelve a quedar disponible para otros.`,
      "",
      `[boton: Pagar mi oferta | ${site()}/cuenta/ofertas]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

export function offerCounterEmail(o: BuyerOffer): { subject: string; body: string } {
  return {
    subject: `Contraoferta por ${o.productName}`,
    body: [
      "# Te hicimos una ==contraoferta==",
      "",
      `Hola ${first(o.buyerName)}, por ${pair(o)} ofreciste ${formatPrice(o.amount)} y podemos dejarlo en **${formatPrice(o.counterAmount)}**.`,
      ...(o.responseNote ? ["", `> ${o.responseNote}`] : []),
      "",
      `Tienes **${hours(siteConfig.offers.replyHours)}** para aceptarla o rechazarla.`,
      "",
      `[boton: Ver contraoferta | ${site()}/cuenta/ofertas]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

export function offerRejectedEmail(o: BuyerOffer): { subject: string; body: string } {
  return {
    subject: `Sobre tu oferta por ${o.productName}`,
    body: [
      "# Tu oferta no pudo ser ==aceptada==",
      "",
      `Hola ${first(o.buyerName)}, esta vez no pudimos aceptar tu oferta de ${formatPrice(o.amount)} por ${pair(o)}.`,
      ...(o.responseNote ? ["", `> ${o.responseNote}`] : []),
      "",
      "Puedes hacer otra oferta o comprarlo al precio publicado.",
      "",
      `[boton: Ver el par | ${site()}/sneakers]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/** Aviso al equipo: el comprador respondió una contraoferta. */
export function counterAnsweredTeamEmail(o: BuyerOffer, accepted: boolean): { subject: string; body: string } {
  return {
    subject: `${accepted ? "✅ Aceptó" : "❌ Rechazó"} tu contraoferta: ${o.productName}`,
    body: [
      `# ${accepted ? "Contraoferta ==aceptada==" : "Contraoferta rechazada"}`,
      "",
      `${o.buyerName || o.buyerEmail} ${accepted ? `aceptó ${formatPrice(o.counterAmount)} por` : "rechazó la contraoferta por"} ${pair(o)}.`,
      "",
      `[boton: Ver ofertas | ${site()}/admin/ofertas-clientes]`,
    ].join("\n"),
  };
}
