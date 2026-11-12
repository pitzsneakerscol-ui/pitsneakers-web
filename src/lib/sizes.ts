/** Equivalencias de calzado (referencia Nike/Jordan): US hombre → EU. Las demás marcas varían ±0,5.
 * En Colombia se pide la talla en numeración europea (39, 40, 41…). */
export const EU: Record<number, number> = {
  5: 37.5, 5.5: 38, 6: 38.5, 6.5: 39, 7: 40, 7.5: 40.5, 8: 41, 8.5: 42, 9: 42.5, 9.5: 43,
  10: 44, 10.5: 44.5, 11: 45, 11.5: 45.5, 12: 46, 12.5: 47, 13: 47.5, 14: 48.5,
};

export const fmtSize = (n: number) => String(n).replace(".", ",");

/** Talla del par ("9", "8.5", "7.5W") a su equivalente US hombre. Las de mujer (W) son hombre + 1,5. */
export function toMen(size: string): number | null {
  const m = size.trim().match(/^(\d+(?:[.,]\d+)?)\s*(w)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return m[2] ? n - 1.5 : n;
}

/** Calzado con numeración propia (Crocs, chanclas/slides): la tabla de tenis no aplica. */
const OTHER_SIZING = /crocs|clog|slide|chancla|sandal/i;

/** Equivalente EU ("42,5") de una talla US, o null si no aplica (ropa, accesorios, tallas únicas, Crocs/chanclas). */
export function euOf(size: string, p: { category?: string; brand?: string; name?: string }): string | null {
  if (p.category && p.category !== "sneakers") return null;
  if (OTHER_SIZING.test(`${p.brand ?? ""} ${p.name ?? ""}`)) return null;
  const men = toMen(size);
  if (men === null) return null;
  const eu = EU[men];
  return eu === undefined ? null : fmtSize(eu);
}
