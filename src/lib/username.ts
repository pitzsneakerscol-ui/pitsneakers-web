/** Largo máximo de un usuario. Se usa también al iniciar sesión, para que lo escrito nunca se recorte distinto. */
export const USERNAME_MAX = 40;
export const USERNAME_MIN = 3;

/** Normaliza lo que se escribe como usuario: sin @ al inicio, espacios sobrantes quitados y en minúsculas. */
export function cleanUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/\s+/g, " ").toLowerCase().slice(0, USERNAME_MAX);
}

/**
 * Casi todo vale (letras, números, tildes, espacios, símbolos). Solo se evita lo que rompe datos:
 * comas y comillas (la columna VENDEDOR del catálogo es un CSV) y caracteres de control.
 * Devuelve el mensaje de error, o null si el usuario es válido.
 */
export function usernameError(username: string): string | null {
  if (username.length < USERNAME_MIN) return `El usuario debe tener al menos ${USERNAME_MIN} caracteres.`;
  if (/[,"\u0000-\u001f\u007f]/.test(username)) return "El usuario no puede llevar comas, comillas ni saltos de línea.";
  return null;
}
