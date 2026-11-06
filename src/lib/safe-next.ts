/**
 * Destino al que se vuelve después de ingresar. Solo se aceptan rutas internas del panel de revendedores
 * (nada de enlaces a otros sitios), para que el enlace de ingreso no pueda mandar a nadie a una página ajena.
 */
export function safeNext(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length === 0 || s.length > 200) return null;
  if (!s.startsWith("/revendedores/") || s.startsWith("//") || s.includes("\\") || /[\r\n]/.test(s)) return null;
  return s;
}

/** Enlace de ingreso que, una vez adentro, lleva al par: /revendedores/ingresar?next=/revendedores/inventario#par-12 */
export function loginLinkTo(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/$/, "")}/revendedores/ingresar?next=${encodeURIComponent(path)}`;
}
