import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { formatWhen } from "@/lib/auction-shared";

const url = () => `${siteConfig.siteUrl.replace(/\/$/, "")}/trivia`;

/** Correo al ganador con su código de crédito. */
export function creditWinnerEmail(o: { code: string; amount: number; title: string }): { subject: string; body: string } {
  return {
    subject: `Ganaste ${formatPrice(o.amount)} de crédito en Pitsneakers 🏆`,
    body: [
      "# ¡Ganaste ==la trivia==!",
      "",
      `Respondiste mejor que todos en **${o.title}** y te ganaste **${formatPrice(o.amount)}** para tu próxima compra.`,
      "",
      `> **Tu código:** ==${o.code}==`,
      `> Valor: ${formatPrice(o.amount)} de descuento. Es personal: úsalo con este mismo correo.`,
      "",
      "- Entra a cualquier par del catálogo y pulsa **Comprar ahora**.",
      "- Escribe tu código en el campo de crédito y se descuenta del total.",
      "",
      `[boton: Ir al catálogo | ${siteConfig.siteUrl.replace(/\/$/, "")}/sneakers]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}

/** Aviso a la lista de espera: hay trivia con premio. */
export function triviaAnnounceEmail(o: { title: string; startsAt: number; prize: number; questions: number }): { subject: string; body: string } {
  return {
    subject: `Trivia en vivo: gana ${formatPrice(o.prize)} 🎮`,
    body: [
      `# ${o.title}`,
      "",
      `Juega la trivia en vivo de Pitsneakers: **${o.questions} preguntas**, contra el reloj. Quien responda mejor se lleva **${formatPrice(o.prize)}** de crédito para comprar.`,
      "",
      `> **Empieza:** ${formatWhen(o.startsAt)} (hora de Colombia)`,
      "",
      "- Entra con tu correo y tu **pase personal** unos minutos antes.",
      "- Cada pregunta tiene pocos segundos: responde rápido, el tiempo cuenta para el desempate.",
      "",
      `[boton: Entrar a la trivia | ${url()}]`,
      "",
      "**Equipo Pitsneakers**",
    ].join("\n"),
  };
}
