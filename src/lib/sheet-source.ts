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

/** Tallas con cantidad opcional: "9x18,9.5x2,10" → tallas 9, 9.5 y 10; cantidades 18, 2 y 1. */
function parseSizes(value: string): { sizes: string[]; counts: Record<string, number> } {
  const sizes: string[] = [];
  const counts: Record<string, number> = {};
  for (const token of parseList(value)) {
    const m = /^(.+?)\s*x\s*(\d+)$/i.exec(token);
    const size = m ? m[1].trim() : token;
    const qty = m ? Math.max(1, Number(m[2])) : 1;
    if (!sizes.includes(size)) sizes.push(size);
    counts[size] = (counts[size] ?? 0) + qty;
  }
  return { sizes, counts };
}

function parsePrice(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

interface BuiltRow {
  product: Product;
  seller: string;
  counts: Record<string, number>;
}

function sellerOf(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/\s+/g, " ").toLowerCase();
}

/** Todas las filas válidas del CSV (con nombre y marca), con su slug único, vendedor y cantidades por talla. */
function buildRows(rows: string[][]): BuiltRow[] {
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
      const { sizes, counts } = parseSizes(getCell(cols, "tallas"));

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
        sizes,
        condition,
        description: getCell(cols, "descripcion"),
        images: parseList(getCell(cols, "fotos")),
        featured: parseBoolean(getCell(cols, "destacado")),
        isNew: parseBoolean(getCell(cols, "lanzamiento")),
        // Las filas de más abajo en la hoja se consideran más recientes.
        dateAdded: new Date(index * 60000).toISOString(),
      };

      const built: BuiltRow = { product, seller: sellerOf(getCell(cols, "vendedor")), counts };
      return built;
    })
    .filter((p): p is BuiltRow => p !== null);

  // Evita choques de URL si dos filas generan el mismo slug.
  const seen = new Map<string, number>();
  return products.map((b) => {
    const count = seen.get(b.product.slug) ?? 0;
    seen.set(b.product.slug, count + 1);
    return count === 0 ? b : { ...b, product: { ...b.product, slug: `${b.product.slug}-${count + 1}` } };
  });
}

/**
 * Catálogo público. Un par con vendedor que todavía no tiene foto no se publica (solo queda en el inventario de su vendedor);
 * apenas se le agrega la foto en el CSV, aparece en el catálogo.
 */
export function rowsToProducts(rows: string[][]): Product[] {
  return buildRows(rows)
    .filter((b) => !(b.seller && b.product.images.length === 0))
    .map((b) => b.product);
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
  /** unidades por talla cuando hay más de una (si falta una talla, es 1) */
  counts?: Record<string, number>;
  price: number;
  condition: ProductCondition;
  image: string;
  /** solo si no son tenis (ropa o accesorio) */
  kind?: "ropa" | "accesorio";
}

/** Filas con VENDEDOR lleno (usuario del vendedor, con o sin @). El slug es el mismo que el del producto publicado. */
export function rowsToAssignments(rows: string[][]): SellerAssignment[] {
  const out: SellerAssignment[] = [];
  for (const { product: p, seller, counts } of buildRows(rows)) {
    if (!seller) continue;
    const multi = Object.values(counts).some((n) => n > 1);
    out.push({
      seller,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      colorway: p.colorway ?? "",
      sku: typeof p.id === "string" && !/^d+$/.test(p.id) ? p.id : "",
      sizes: p.sizes,
      ...(multi ? { counts } : {}),
      price: p.price,
      condition: p.condition,
      image: p.images[0] ?? "",
      ...(p.category === "streetwear" ? { kind: p.subcategory === "accesorio" ? ("accesorio" as const) : ("ropa" as const) } : {}),
    });
  }
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
