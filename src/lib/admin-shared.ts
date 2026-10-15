import { siteConfig } from "@/config/site";
import { kindHeading, kindNoun, kindsIn, kindsPhrase, type ItemKind } from "@/lib/reseller-shared";

/** Lo que recibe el vendedor al vender a ese precio: el precio publicado menos la comisión de Pitsneakers (porcentaje, con un mínimo). */
export function sellerPayout(price: number): number {
  if (!(price > 0)) return 0;
  const commission = Math.max(Math.round((price * siteConfig.commission.percent) / 100), siteConfig.commission.minimum);
  return Math.max(0, price - commission);
}

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

/** Correo automático para avisarle al vendedor que se le cargaron pares en su inventario. */
export function inventoryEmail(opts: {
  name: string;
  items: { name: string; size: string; price: number; kind?: ItemKind }[];
  siteUrl: string;
}): { subject: string; body: string } {
  const url = `${opts.siteUrl.replace(/\/$/, "")}/revendedores/inventario`;
  const n = opts.items.length;
  // Mismo artículo y mismo precio en varias tallas = una sola línea con todas las tallas.
  const money = (v: number) => `$${v.toLocaleString("es-CO")}`;
  const total = opts.items.reduce((s, i) => s + sellerPayout(i.price), 0);
  // Qué se cargó: pares, prendas o accesorios (o una mezcla). El correo lo dice y separa las líneas por tipo.
  const kinds = kindsIn(opts.items);
  const phrase = kindsPhrase(opts.items);
  const feminine = kinds.length === 1 && kinds[0] === "ropa";
  const subject =
    n === 1
      ? `Ya quedó ${feminine ? "cargada" : "cargado"} tu ${kindNoun(kinds[0])} en Pitsneakers`
      : kinds.length > 1
        ? `Ya quedaron cargados tus ${n} artículos en Pitsneakers`
        : `Ya quedaron ${feminine ? "cargadas" : "cargados"} tus ${phrase} en Pitsneakers`;
  const perUnit = kinds.length === 1 && kinds[0] === "tenis" ? "por par" : "por unidad";
  const lineFor = (g: { name: string; price: number; sizes: string[] }) =>
    `- **${g.name}**${g.sizes.length ? ` · ${g.sizes.length > 1 ? "tallas" : "talla"} ${g.sizes.join(", ")}` : ""}${g.price > 0 ? ` · precio ${money(g.price)} · esperas recibir **${money(sellerPayout(g.price))}**${g.sizes.length > 1 ? ` ${perUnit}` : ""}` : ""}`;
  const sections: string[] = [];
  for (const k of kinds) {
    const g2 = new Map<string, { name: string; price: number; sizes: string[] }>();
    for (const i of opts.items.filter((x) => (x.kind ?? "tenis") === k)) {
      const g = g2.get(`${i.name}|${i.price}`) ?? { name: i.name, price: i.price, sizes: [] };
      if (i.size && !g.sizes.includes(i.size)) g.sizes.push(i.size);
      g2.set(`${i.name}|${i.price}`, g);
    }
    const list = [...g2.values()];
    if (kinds.length > 1) sections.push(`**${kindHeading(k)}**`, "");
    sections.push(...list.slice(0, 10).map(lineFor));
    if (list.length > 10) sections.push(`- …y ${list.length - 10} modelos más (los ves todos en tu panel)`);
    sections.push("");
  }
  const body = [
    "# Tu stock ==ya quedó cargado==",
    "",
    `Hola ${opts.name},`,
    "",
    `Ya cargamos **${phrase}** de tu stock en Pitsneakers:`,
    "",
    ...sections,
    ...(total > 0 ? [`> **Si se venden ${n === 1 ? "al precio publicado" : "todos al precio publicado"}, recibes:** ${money(total)}`, `> Es el precio menos la comisión de Pitsneakers (${siteConfig.commission.percent}%, mínimo ${money(siteConfig.commission.minimum)} por ${kinds.length === 1 && kinds[0] === "tenis" ? "par" : "unidad"}).`, ""] : []),
    `[boton: Ver mi inventario | ${url}]`,
    "",
    "Entra a tu panel para poner lo que te costó cada artículo: ahí ves tu utilidad real. Si algo no te cuadra, responde a este correo y lo revisamos.",
    "",
    "**Equipo Pitsneakers**",
  ].join("\n");
  return { subject, body };
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
