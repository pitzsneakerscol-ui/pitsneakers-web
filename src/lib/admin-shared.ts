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

export const waLink = (number: string, message = "") =>
  `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
