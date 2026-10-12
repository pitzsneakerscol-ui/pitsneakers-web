/** Los puestos 1 a 20 están reservados: nadie los ocupa. El primer vendedor real aparece en el puesto 21. */
export const RANK_START = 21;
/** Cantidad de puestos reservados que se muestran bloqueados arriba (el podio). */
export const PODIUM_SLOTS = 3;

export interface Level {
  key: string;
  name: string;
  icon: string;
  /** pedidos necesarios para llegar a este nivel */
  min: number;
  /** clases de Tailwind para la insignia */
  badge: string;
  bar: string;
}

export const LEVELS: Level[] = [
  { key: "novato", name: "Novato", icon: "🌱", min: 0, badge: "bg-line text-ink", bar: "bg-muted" },
  { key: "bronce", name: "Bronce", icon: "🥉", min: 1, badge: "bg-[#f1dcc4] text-[#7a4a1b]", bar: "bg-[#b9773a]" },
  { key: "plata", name: "Plata", icon: "🥈", min: 5, badge: "bg-[#e4e7ea] text-[#4a5560]", bar: "bg-[#8d99a5]" },
  { key: "oro", name: "Oro", icon: "🥇", min: 15, badge: "bg-[#fbe9a8] text-[#7a5a00]", bar: "bg-[#e0a800]" },
  { key: "platino", name: "Platino", icon: "💠", min: 30, badge: "bg-[#d6eef5] text-[#0f5a73]", bar: "bg-[#2aa3c7]" },
  { key: "diamante", name: "Diamante", icon: "💎", min: 60, badge: "bg-ink text-white", bar: "bg-accent" },
];

export function levelFor(orders: number): Level {
  let level = LEVELS[0];
  for (const l of LEVELS) if (orders >= l.min) level = l;
  return level;
}

export function nextLevel(orders: number): Level | null {
  return LEVELS.find((l) => l.min > orders) ?? null;
}

export interface RankRow {
  userId: number;
  name: string;
  orders: number;
  /** puesto que se muestra (empieza en RANK_START) */
  rank: number;
}

export type RankPeriod = "mes" | "total";

/** Tapa un nombre con x para que nadie lo identifique del todo: "sebastianzon" -> "sebastixxxzon". Los espacios se conservan. */
export function maskName(name: string): string {
  return name
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      const chars = [...part];
      const n = chars.length;
      if (n <= 2) return chars[0] + "x".repeat(n - 1);
      const head = Math.max(1, Math.ceil(n * 0.4));
      const tail = n >= 6 ? Math.floor(n * 0.25) : 0;
      const hidden = Math.max(2, n - head - tail);
      return chars.slice(0, head).join("") + "x".repeat(hidden) + (tail ? chars.slice(n - tail).join("") : "");
    })
    .join("");
}
