import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { formatWhen } from "@/lib/auction-shared";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

const url = () => `${siteConfig.siteUrl.replace(/\/$/, "")}/subasta`;

/** Le avisa al que iba ganando que lo superaron. */
export function outbidEmail(opts: { item: string; amount: number; minNext: number }): { subject: string; body: string } {
  return {
    subject: `Te superaron en ${opts.item}`,
    body: [
      "# Te ==superaron==",
      "",
      `Alguien pujó **${formatPrice(opts.amount)}** por **${opts.item}**.`,
      "",
      `> Para volver a ganar necesitas pujar al menos **${formatPrice(opts.minNext)}**.`,
      "",
      `[boton: Volver a pujar | ${url()}]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/** Le avisa al ganador de un par y le da el paso para pagar. */
export function winnerEmail(opts: { item: string; amount: number; size: string }): { subject: string; body: string } {
  const wa = buildGeneralWhatsAppLink(`Hola! Gané ${opts.item}${opts.size ? ` talla ${opts.size}` : ""} en la subasta por ${formatPrice(opts.amount)}. ¿Cómo coordinamos el pago?`);
  return {
    subject: `Ganaste ${opts.item} 🏆`,
    body: [
      "# ¡Ganaste ==la subasta==!",
      "",
      `Tu puja de **${formatPrice(opts.amount)}** fue la más alta por **${opts.item}**${opts.size ? ` (talla ${opts.size})` : ""}.`,
      "",
      "> Escríbenos por WhatsApp para coordinar el pago y el envío. Reservamos el par para ti por **24 horas**.",
      "",
      `[boton: Coordinar por WhatsApp | ${wa}]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/** Aviso a la lista de espera: la subasta ya tiene fecha. */
export function announceEmail(opts: { title: string; startsAt: number; endsAt: number; pairs: number }): { subject: string; body: string } {
  return {
    subject: `Se abre la subasta: ${opts.pairs} pares exclusivos 🔨`,
    body: [
      `# ${opts.title}`,
      "",
      `Por estar en la lista tienes entrada a la subasta de **${opts.pairs} pares exclusivos** que no están en el catálogo.`,
      "",
      `> **Abre:** ${formatWhen(opts.startsAt)}`,
      `> **Cierra:** ${formatWhen(opts.endsAt)} (hora de Colombia)`,
      "",
      "- Entra con tu correo y tu **pase personal** (el código que te llegó al inscribirte).",
      "- Cada puja debe superar la anterior por el incremento del par.",
      "- Si alguien puja en los últimos 2 minutos, el par se alarga 2 minutos más.",
      "",
      `[boton: Entrar a la subasta | ${url()}]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}
