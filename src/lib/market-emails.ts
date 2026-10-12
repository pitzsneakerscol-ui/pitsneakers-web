import { formatPrice } from "@/lib/format";

/** Correo que le llega al equipo (info@pitsneakers.com) cuando un revendedor hace una consulta de mercado. */
export function questionEmail(opts: {
  seller: string;
  username: string;
  sellerEmail: string;
  model: string;
  size: string;
  buyPrice: number;
  note: string;
  adminUrl: string;
}): { subject: string; body: string } {
  const subject = `Consulta de mercado: ${opts.model}${opts.size ? ` (${opts.size})` : ""} — ${opts.seller}`;
  const body = [
    "# Nueva consulta ==de mercado==",
    "",
    `**${opts.seller}** (@${opts.username}) pregunta si le recomendamos comprar este par:`,
    "",
    `> **Par:** ${opts.model}`,
    ...(opts.size ? [`> **Talla:** ${opts.size}`] : []),
    ...(opts.buyPrice > 0 ? [`> **Lo compraría a:** ${formatPrice(opts.buyPrice)}`] : []),
    ...(opts.note ? [`> **Quiere saber:** ${opts.note}`] : []),
    "",
    opts.sellerEmail
      ? `Puedes responder directamente a este correo: le llega a ${opts.sellerEmail}. También puedes responder desde el panel y le avisamos por correo y en su campana.`
      : "Este vendedor no tiene correo registrado: respóndele desde el panel de administrador y le llegará el aviso en su campana.",
    "",
    `[boton: Responder en el panel | ${opts.adminUrl}]`,
  ].join("\n");
  return { subject, body };
}

const VERDICT_TEXT: Record<string, string> = {
  comprar: "✅ Sí, te recomendamos comprarlo",
  esperar: "⏳ Mejor espera un poco",
  no: "❌ No te lo recomendamos",
};

export const verdictLabel = (v: string) => VERDICT_TEXT[v] ?? "";

/** Correo que le llega al vendedor cuando el equipo responde su consulta. */
export function answerEmail(opts: {
  name: string;
  model: string;
  size: string;
  verdict: string;
  answer: string;
  url: string;
}): { subject: string; body: string } {
  const subject = `Respuesta del equipo: ${opts.model}`;
  const body = [
    "# Te respondimos ==tu consulta==",
    "",
    `Hola ${opts.name},`,
    "",
    `Sobre **${opts.model}**${opts.size ? ` (talla ${opts.size})` : ""}:`,
    "",
    `> **${verdictLabel(opts.verdict)}**`,
    ...(opts.answer ? opts.answer.split(/\r?\n/).map((l) => `> ${l}`) : []),
    "",
    `[boton: Ver mis consultas | ${opts.url}]`,
    "",
    "Es una opinión del equipo con lo que vemos en el mercado, no una garantía de reventa. Si quieres otra consulta, escríbela desde tu panel.",
    "",
    "**Equipo Pitsneakers**",
  ].join("\n");
  return { subject, body };
}
