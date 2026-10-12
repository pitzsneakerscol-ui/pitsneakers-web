export function fmtDateTime(ms: number): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function fmtDay(ms: number): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

/** "hoy", "hace 3 días"… */
export function ago(ms: number | null): string {
  if (ms === null) return "nunca";
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

/** Número listo para wa.me: solo dígitos y, si son 10 dígitos de celular colombiano (3xx...), con el 57 delante. */
export function waNumber(raw: string): string {
  const d = raw.replace(/[^\d]/g, "");
  return d.length === 10 && d.startsWith("3") ? `57${d}` : d;
}

/** Mensaje de bienvenida con el acceso, para enviarle por WhatsApp al vendedor recién creado. */
export function welcomeMessage(opts: { name: string; username: string; password: string; siteUrl: string; reset?: boolean }): string {
  const url = `${opts.siteUrl.replace(/\/$/, "")}/revendedores/ingresar`;
  return [
    opts.reset ? `Hola ${opts.name}! Te cambiamos la contraseña de tu cuenta en Pitsneakers.` : `Hola ${opts.name}! Ya creamos tu cuenta de vendedor en Pitsneakers 🎉`,
    "",
    `Entra aquí: ${url}`,
    `Usuario: ${opts.username}`,
    `Contraseña: ${opts.password}`,
    "",
    "Ahí ves tu inventario con tus pares, tus ventas y tu ranking. Te recomendamos cambiar la contraseña en la sección Cuenta.",
  ].join("\n");
}

/** Correo con el acceso del vendedor (usa el formato de marca de los correos de Pitsneakers). */
export function accessEmail(opts: { name: string; username: string; password: string; siteUrl: string; reset?: boolean }): { subject: string; body: string } {
  const url = `${opts.siteUrl.replace(/\/$/, "")}/revendedores/ingresar`;
  const subject = opts.reset ? "Tu nueva contraseña de Pitsneakers" : "Tu cuenta de vendedor en Pitsneakers ya está lista";
  const body = [
    opts.reset ? "# Tu contraseña ==cambió==" : "# Tu cuenta ==ya está lista==",
    "",
    `Hola ${opts.name},`,
    "",
    opts.reset
      ? "Cambiamos la contraseña de tu cuenta de vendedor en Pitsneakers. Estos son tus datos de acceso:"
      : "Ya creamos tu cuenta de vendedor en Pitsneakers. Estos son tus datos de acceso:",
    "",
    `> **Usuario:** ${opts.username}`,
    `> **Contraseña:** ${opts.password}`,
    "",
    `[boton: Entrar a mi panel | ${url}]`,
    "",
    "Ahí vas a ver tu inventario con tus pares, tus ventas y tu ranking. Te recomendamos **cambiar la contraseña** en la sección Cuenta apenas entres, y borrar este correo después.",
    "",
    "**Equipo Pitsneakers**",
  ].join("\n");
  return { subject, body };
}

export const waLink = (number: string, message = "") =>
  `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
