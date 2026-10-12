/** Correo con el enlace para crear una contraseña nueva. */
export function resetEmail(opts: { name: string; username: string; url: string }): { subject: string; body: string } {
  const subject = "Restablece tu contraseña de Pitsneakers";
  const body = [
    "# Crea tu ==nueva contraseña==",
    "",
    `Hola ${opts.name},`,
    "",
    "Recibimos una solicitud para restablecer la contraseña de tu cuenta de vendedor en Pitsneakers.",
    "",
    `> **Tu usuario:** ${opts.username}`,
    "",
    `[boton: Crear nueva contraseña | ${opts.url}]`,
    "",
    "Este enlace funciona **una sola vez** y vence en **1 hora**. Si tú no lo pediste, ignora este correo: tu contraseña sigue igual.",
    "",
    "**Equipo Pitsneakers**",
  ].join("\n");
  return { subject, body };
}
