import { formatPrice } from "@/lib/format";

/** Correo para el equipo (info@pitsneakers.com) cuando un vendedor responde una oferta desde su panel. */
export function offerResponseEmail(opts: {
  seller: string;
  username: string;
  sellerEmail: string;
  par: string;
  size: string;
  amount: number;
  status: "aceptada" | "rechazada" | "contraoferta";
  counterAmount: number;
  note: string;
  adminUrl: string;
}): { subject: string; body: string } {
  const par = `${opts.par}${opts.size ? ` (talla ${opts.size})` : ""}`;
  const head =
    opts.status === "aceptada"
      ? "✅ Aceptó la oferta"
      : opts.status === "rechazada"
        ? "❌ Rechazó la oferta"
        : `🔁 Contraofertó ${formatPrice(opts.counterAmount)}`;
  const subject = `${opts.status === "aceptada" ? "Oferta aceptada" : opts.status === "rechazada" ? "Oferta rechazada" : "Contraoferta"}: ${opts.par} — ${opts.seller}`;
  const body = [
    `# ${opts.status === "aceptada" ? "Oferta ==aceptada==" : opts.status === "rechazada" ? "Oferta ==rechazada==" : "Nueva ==contraoferta=="}`,
    "",
    `**${opts.seller}** (@${opts.username}) respondió la oferta por su par:`,
    "",
    `> **Par:** ${par}`,
    `> **Oferta del comprador:** ${formatPrice(opts.amount)}`,
    `> **Respuesta:** ${head}`,
    ...(opts.note ? [`> **Comentario:** ${opts.note}`] : []),
    "",
    opts.status === "aceptada"
      ? "El par quedó **reservado** en su inventario. Coordina con el comprador y el vendedor para cerrar la venta."
      : opts.status === "contraoferta"
        ? "Avísale al comprador de la nueva cifra y cuéntale al vendedor qué respondió."
        : "No hay nada más por hacer con esta oferta, salvo avisarle al comprador.",
    ...(opts.sellerEmail ? ["", `Puedes responder este correo para escribirle al vendedor (${opts.sellerEmail}).`] : []),
    "",
    `[boton: Ver ofertas | ${opts.adminUrl}]`,
  ].join("\n");
  return { subject, body };
}
