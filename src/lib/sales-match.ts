// Emparejamiento del registro rápido de ventas. Lo usan el navegador (vista previa en vivo) y el servidor (decisión final).

export interface GridReseller {
  id: number;
  username: string;
  name: string;
}

export interface GridStock {
  id: number;
  userId: number;
  /** nombre del par (sin talla) */
  label: string;
  size: string;
  expectedPrice: number;
  cost: number;
}

export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** "9 US", "9us" y "9" son la misma talla; "7.5" y "7,5" también. */
export const normSize = (s: string): string => norm(s.replace(/,/g, ".")).replace(/\b(us|usa|eu|uk)\b/g, "").replace(/\s+/g, "");

/** Revendedor por usuario o nombre: exacto, o único que empiece/contenga lo escrito. */
export function resolveReseller(list: GridReseller[], text: string): GridReseller | null {
  const t = norm(text.replace(/^@+/, ""));
  if (!t) return null;
  const exact = list.find((r) => norm(r.username) === t || norm(r.name) === t);
  if (exact) return exact;
  const starts = list.filter((r) => norm(r.username).startsWith(t) || norm(r.name).startsWith(t));
  if (starts.length === 1) return starts[0];
  const has = list.filter((r) => norm(r.username).includes(t) || norm(r.name).includes(t));
  return has.length === 1 ? has[0] : null;
}

/** Texto que muestra la lista de pares de un revendedor (y que identifica un par exacto cuando se elige). */
export const stockOptionLabel = (s: Pick<GridStock, "label" | "size">): string => `${s.label} · talla ${s.size || "única"}`;

/** Par del inventario del revendedor que coincide con lo escrito (y con la talla, si se indicó). */
export function findStock(stock: GridStock[], userId: number, name: string, size: string): GridStock | null {
  const mine = stock.filter((s) => s.userId === userId);
  const exact = mine.find((s) => stockOptionLabel(s) === name.trim());
  if (exact) return exact;
  const n = norm(name.replace(/·\s*talla.*$/i, ""));
  if (!n) return null;
  const sz = normSize(size);
  const byName = mine.filter((s) => norm(s.label) === n).concat(mine.filter((s) => norm(s.label) !== n && norm(s.label).includes(n)));
  return byName.find((s) => (sz ? normSize(s.size) === sz : true)) ?? null;
}

/** Fecha en cualquier formato común → AAAA-MM-DD ("" si no se entiende). */
export function parseDate(text: string, today: string): string {
  const t = text.trim();
  if (!t) return today;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(t);
  if (!m) return "";
  const year = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : today.slice(0, 4);
  return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

export const digits = (s: string): number => Number(s.replace(/[^\d]/g, "")) || 0;
