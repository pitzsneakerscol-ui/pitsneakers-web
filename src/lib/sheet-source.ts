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

      const precioAntes = getCell(cols, "precio_antes");

      const product: Product = {
        id: sku || String(index + 1),
        slug: slugBase || `producto-${index + 1}`,
        name,
        brand,
        colorway: colorway || undefined,
        category,
        subcategory: getCell(cols, "subcategoria") || undefined,
        price: parsePrice(getCell(cols, "precio")),
        priceBefore: precioAntes ? parsePrice(precioAntes) : undefined,
        promo: parseBoolean(getCell(cols, "promo")),
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

/**
 * Par del catálogo que le pertenece a un vendedor (columna VENDEDOR del CSV). Se guarda aparte del catálogo público
 * (src/data/assignments.json) para que el nombre del vendedor nunca viaje al navegador de los compradores.
 */
export interface SellerAssignment {
  seller: string;
  slug: string;
  name: string;
  brand: string;
  colorway: string;
  sku: string;
  sizes: string[];
  price: number;
  condition: ProductCondition;
  image: string;
}

/** Filas con VENDEDOR lleno (usuario del vendedor, con o sin @). El slug es el mismo que el del producto publicado. */
export function rowsToAssignments(rows: string[][]): SellerAssignment[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const col = headers.indexOf("vendedor");
  if (col === -1) return [];
  const products = rowsToProducts(rows);
  // rowsToProducts descarta las filas sin nombre o marca: se recorre igual para que coincidan por posición.
  const nameCol = headers.indexOf("nombre");
  const brandCol = headers.indexOf("marca");
  const valid = rows.slice(1).filter((cols) => (cols[nameCol] ?? "").trim() && (cols[brandCol] ?? "").trim());
  const out: SellerAssignment[] = [];
  valid.forEach((cols, i) => {
    const seller = (cols[col] ?? "").trim().replace(/^@+/, "").replace(/\s+/g, " ").toLowerCase();
    const p = products[i];
    if (!seller || !p) return;
    out.push({
      seller,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      colorway: p.colorway ?? "",
      sku: typeof p.id === "string" && !/^d+$/.test(p.id) ? p.id : "",
      sizes: p.sizes,
      price: p.price,
      condition: p.condition,
      image: p.images[0] ?? "",
    });
  });
  return out;
}

export async function fetchProductsFromSheet(url: string): Promise<Product[]> {
  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) {
    throw new Error(`No se pudo leer el Google Sheet (${res.status})`);
  }
  const text = await res.text();
  return rowsToProducts(parseCSV(text));
}
