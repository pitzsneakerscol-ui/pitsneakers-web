import { Product, ProductCategory, ProductCondition } from "@/types/product";

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // skip
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseBoolean(value: string): boolean {
  const v = value.trim().toLowerCase();
  return ["si", "sí", "true", "1", "x", "yes"].includes(v);
}

function parseList(value: string): string[] {
  return value
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePrice(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

export function rowsToProducts(rows: string[][]): Product[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  const getCell = (cols: string[], header: string) => {
    const i = headers.indexOf(header);
    return i === -1 ? "" : (cols[i] ?? "").trim();
  };

  const products = dataRows
    .map((cols, index) => {
      const name = getCell(cols, "nombre");
      const brand = getCell(cols, "marca");
      if (!name || !brand) return null;

      const sku = getCell(cols, "sku");
      const colorway = getCell(cols, "colorway");
      const categoryRaw = getCell(cols, "categoria").toLowerCase();
      const category: ProductCategory = categoryRaw.includes("street")
        ? "streetwear"
        : "sneakers";
      const conditionRaw = getCell(cols, "condicion").toLowerCase();
      const condition: ProductCondition = conditionRaw.includes("usa")
        ? "usado"
        : "nuevo";
      const slugBase = slugify(`${brand}-${name}-${colorway}`);

      const product: Product = {
        id: sku || String(index + 1),
        slug: slugBase || `producto-${index + 1}`,
        name,
        brand,
        colorway: colorway || undefined,
        category,
        subcategory: getCell(cols, "subcategoria") || undefined,
        price: parsePrice(getCell(cols, "precio")),
        sizes: parseList(getCell(cols, "tallas")),
        condition,
        description: getCell(cols, "descripcion"),
        images: parseList(getCell(cols, "fotos")),
        featured: parseBoolean(getCell(cols, "destacado")),
        isNew: parseBoolean(getCell(cols, "lanzamiento")),
        // Las filas de más abajo en la hoja se consideran más recientes.
        dateAdded: new Date(index * 60000).toISOString(),
      };

      return product;
    })
    .filter((p): p is Product => p !== null);

  // Evita choques de URL si dos filas generan el mismo slug.
  const seen = new Map<string, number>();
  return products.map((p) => {
    const count = seen.get(p.slug) ?? 0;
    seen.set(p.slug, count + 1);
    return count === 0 ? p : { ...p, slug: `${p.slug}-${count + 1}` };
  });
}

export async function fetchProductsFromSheet(url: string): Promise<Product[]> {
  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) {
    throw new Error(`No se pudo leer el Google Sheet (${res.status})`);
  }
  const text = await res.text();
  return rowsToProducts(parseCSV(text));
}
