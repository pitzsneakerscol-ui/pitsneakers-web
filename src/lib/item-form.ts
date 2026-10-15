import { isValidDate, parseKind, todayBogota } from "@/lib/reseller-shared";
import type { NewItemData } from "@/lib/reseller";

/** Lectura y validación del formulario de "agregar par", compartida por el panel del revendedor y el del administrador. */

export const text = (fd: FormData, key: string, max: number): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

export function money(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const digits = v.replace(/[^\d]/g, "");
  if (digits === "") return null;
  return Math.min(Number(digits), 1_000_000_000);
}

export function readItem(
  fd: FormData
): { data: NewItemData } | { error: string } {
  const name = text(fd, "name", 120);
  if (!name) return { error: "Escribe el nombre del artículo." };

  const cost = money(fd, "cost");
  if (cost === null) return { error: "Indica cuánto pagaste por el artículo (puede ser 0)." };
  const extraCost = money(fd, "extraCost") ?? 0;
  const expectedPrice = money(fd, "expectedPrice") ?? 0;

  const today = todayBogota();
  const rawDate = text(fd, "purchaseDate", 10);
  if (rawDate && !isValidDate(rawDate)) return { error: "La fecha de compra no es válida." };

  const imageUrl = text(fd, "imageUrl", 300);
  if (imageUrl && !/^(https:\/\/|\/products\/)/.test(imageUrl))
    return { error: "La foto debe ser un link https:// (o dejarse vacía)." };

  const catalogSlug = text(fd, "catalogSlug", 120);
  if (catalogSlug && !/^[a-z0-9-]+$/.test(catalogSlug)) return { error: "Referencia de catálogo inválida." };

  return {
    data: {
      brand: text(fd, "brand", 60),
      name,
      colorway: text(fd, "colorway", 80),
      sku: text(fd, "sku", 40),
      condition: fd.get("condition") === "usado" ? "usado" : "nuevo",
      kind: parseKind(fd.get("kind")),
      cost,
      extraCost,
      expectedPrice,
      purchaseDate: rawDate || today,
      source: text(fd, "source", 80),
      notes: text(fd, "notes", 500),
      imageUrl,
      catalogSlug,
    },
  };
}

/** "9, 9.5, 10x2" -> ["9", "9.5", "10", "10"] */
export function parseSizes(raw: string): string[] {
  const out: string[] = [];
  for (const token of raw.split(/[,;]+/)) {
    const t = token.trim();
    if (!t) continue;
    const m = t.match(/^(.+?)\s*[x×]\s*(\d{1,2})$/i);
    const size = (m ? m[1] : t).trim().slice(0, 12);
    const count = m ? Math.max(1, Math.min(Number(m[2]), 20)) : 1;
    for (let i = 0; i < count; i++) out.push(size);
  }
  return out;
}
