import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getDb, isDbConfigured } from "@/lib/db";
import { flipPrepared, preparePhoto, type PreparedPhoto } from "@/lib/photo-prep";
import { getStaticProducts } from "@/lib/products";
import type { Product, ProductCategory } from "@/types/product";

/**
 * Modelos que el dueño crea desde el panel con una foto (los del archivo siguen en src/data/products.json).
 * Un modelo es solo la silueta con su foto: lo que sale a la venta son los pares del stock de los revendedores enlazados a él.
 * Sus fotos viven en la base y se sirven en /products/<nombre>, igual que las del archivo.
 */
export interface CatalogModel {
  id: number;
  slug: string;
  brand: string;
  name: string;
  colorway: string;
  category: ProductCategory;
  subcategory: string;
  /** Código de estilo del fabricante, si se conoce. */
  code: string;
  image: string;
  createdAt: number;
}

/** Nombre de una foto del panel: M-<código>.<huella>.webp. La huella cambia si cambia la foto, así ninguna caché muestra la anterior. */
export const MODEL_PHOTO = /^M-[A-Z0-9]{6,10}\.[0-9a-f]{8}\.webp$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DRAFT_DAYS = 2;

const photoName = (code: string, data: Buffer) => `M-${code}.${createHash("sha1").update(data).digest("hex").slice(0, 8)}.webp`;

export interface DraftPhoto {
  name: string;
  facing: PreparedPhoto["facing"];
  background: PreparedPhoto["background"];
  flipped: boolean;
}

/** Prepara la foto (sin fondo, tamaño común, punta a la derecha) y la guarda como borrador hasta que se cree el modelo. */
export async function saveDraftPhoto(input: Buffer, weigh: boolean): Promise<DraftPhoto> {
  const prepared = await preparePhoto(input, { flip: "auto", weigh });
  const code = Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");
  const name = photoName(code, prepared.full);
  const db = await getDb();
  const now = Date.now();
  await db.batch(
    [
      { sql: "DELETE FROM catalog_photos WHERE draft = 1 AND created_at < ?", args: [now - DRAFT_DAYS * 86_400_000] },
      { sql: "INSERT INTO catalog_photos (name, data, thumb, draft, created_at) VALUES (?, ?, ?, 1, ?)", args: [name, prepared.full, prepared.thumb, now] },
    ],
    "write"
  );
  return { name, facing: prepared.facing, background: prepared.background, flipped: prepared.flipped };
}

/** Voltea un borrador. Devuelve su nombre nuevo (la huella cambia), o null si ya no existe o ya es de un modelo. */
export async function flipDraftPhoto(name: string): Promise<string | null> {
  if (!MODEL_PHOTO.test(name)) return null;
  const db = await getDb();
  const row = await db.execute({ sql: "SELECT data FROM catalog_photos WHERE name = ? AND draft = 1", args: [name] });
  if (!row.rows[0]) return null;
  const flipped = await flipPrepared(Buffer.from(row.rows[0].data as ArrayBuffer));
  const next = photoName(name.slice(2, name.indexOf(".")), flipped.full);
  await db.batch(
    [
      { sql: "DELETE FROM catalog_photos WHERE name = ?", args: [name] },
      { sql: "INSERT OR REPLACE INTO catalog_photos (name, data, thumb, draft, created_at) VALUES (?, ?, ?, 1, ?)", args: [next, flipped.full, flipped.thumb, Date.now()] },
    ],
    "write"
  );
  return next;
}

export async function getModelPhoto(name: string, thumb: boolean): Promise<Buffer | null> {
  if (!isDbConfigured() || !MODEL_PHOTO.test(name)) return null;
  const db = await getDb();
  const row = await db.execute({ sql: `SELECT ${thumb ? "thumb" : "data"} AS bytes FROM catalog_photos WHERE name = ?`, args: [name] });
  return row.rows[0] ? Buffer.from(row.rows[0].bytes as ArrayBuffer) : null;
}

const rowToModel = (r: Record<string, unknown>): CatalogModel => ({
  id: Number(r.id),
  slug: String(r.slug),
  brand: String(r.brand),
  name: String(r.name),
  colorway: String(r.colorway ?? ""),
  category: r.category === "streetwear" ? "streetwear" : "sneakers",
  subcategory: String(r.subcategory ?? ""),
  code: String(r.code ?? ""),
  image: String(r.image),
  createdAt: Number(r.created_at),
});

export async function listModels(): Promise<CatalogModel[]> {
  if (!isDbConfigured()) return [];
  const db = await getDb();
  const res = await db.execute("SELECT * FROM catalog_models ORDER BY id");
  return res.rows.map((r) => rowToModel(r as Record<string, unknown>));
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

export interface NewModel {
  brand: string;
  name: string;
  colorway: string;
  category: ProductCategory;
  subcategory: string;
  code: string;
  /** Nombre del borrador de la foto. */
  photo: string;
}

/** Crea el modelo con su foto (el borrador pasa a ser definitivo). `taken` dice si un slug ya lo usa el catálogo del archivo. */
export async function createModel(input: NewModel, taken: (slug: string) => boolean): Promise<CatalogModel | null> {
  const db = await getDb();
  const photo = await db.execute({ sql: "SELECT name FROM catalog_photos WHERE name = ?", args: [input.photo] });
  if (!photo.rows[0]) return null;
  const base = slugify(`${input.brand}-${input.name}-${input.colorway}`) || "modelo";
  const used = new Set((await db.execute("SELECT slug FROM catalog_models")).rows.map((r) => String(r.slug)));
  let slug = base;
  for (let n = 2; taken(slug) || used.has(slug); n++) slug = `${base}-${n}`;
  const now = Date.now();
  const res = await db.batch(
    [
      { sql: "UPDATE catalog_photos SET draft = 0 WHERE name = ?", args: [input.photo] },
      {
        sql: "INSERT INTO catalog_models (slug, brand, name, colorway, category, subcategory, code, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [slug, input.brand, input.name, input.colorway, input.category, input.subcategory, input.code, `/products/${input.photo}`, now],
      },
    ],
    "write"
  );
  return { id: Number(res[1].lastInsertRowid), slug, ...input, image: `/products/${input.photo}`, createdAt: now };
}

/** Los modelos del panel con forma de par del catálogo (sin tallas ni precio): sirven para emparejar y dar foto, no se venden solos. */
export function modelProducts(models: CatalogModel[]): Product[] {
  return models.map((m) => ({
    id: `M-${m.id}`,
    slug: m.slug,
    name: m.name,
    brand: m.brand,
    ...(m.colorway ? { colorway: m.colorway } : {}),
    category: m.category,
    ...(m.subcategory ? { subcategory: m.subcategory } : {}),
    price: 0,
    promo: false,
    sizes: [],
    condition: "nuevo" as const,
    description: m.code ? `Código de estilo ${m.code}.` : "",
    images: [m.image],
    featured: false,
    isNew: false,
    dateAdded: new Date(m.createdAt).toISOString(),
  }));
}

/** Todos los modelos contra los que se empareja el stock de los revendedores: los del archivo y los creados en el panel. */
export async function getSyncProducts(): Promise<Product[]> {
  const [statics, models] = await Promise.all([getStaticProducts(), listModels()]);
  return models.length ? [...statics, ...modelProducts(models)] : statics;
}
