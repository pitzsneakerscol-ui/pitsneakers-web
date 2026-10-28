import "server-only";
import assignmentsJson from "@/data/assignments.json";
import { getDb } from "@/lib/db";
import { resetLiveOverlay } from "@/lib/catalog-live";
import { getStaticProducts } from "@/lib/products";
import { groupProducts } from "@/lib/grouping";
import type { SellerAssignment } from "@/lib/sheet-source";
import type { Product } from "@/types/product";

const assignments = assignmentsJson as SellerAssignment[];

const DAY = 86_400_000;
const NEW_DAYS = 14;

const loose = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9@]+/g, "");
const normSize = (v: string) => v.trim().toLowerCase().replace(",", ".");

export interface LiveRow {
  product: Product;
  sellerId: number;
  sellerName: string;
  /** Pares del stock del revendedor que respaldan esta publicación. */
  units: number;
}

export interface HiddenRow {
  sku: string;
  name: string;
  size: string;
  sellerName: string;
}

export interface PendingRow {
  itemId: number;
  sellerId: number;
  sellerName: string;
  name: string;
  size: string;
  price: number;
  reason: string;
}

export interface CatalogPlan {
  live: LiveRow[];
  hidden: HiddenRow[];
  pending: PendingRow[];
}

interface UserRow {
  id: number;
  name: string;
  keys: string[];
}

interface ItemRow {
  id: number;
  userId: number;
  name: string;
  brand: string;
  size: string;
  condition: "nuevo" | "usado";
  status: string;
  slug: string;
  price: number;
  imageUrl: string;
  createdAt: number;
}

/**
 * Qué debe mostrar la web según el stock de los revendedores:
 *  - live: pares en stock que todavía no están en el catálogo del archivo, con modelo y foto del catálogo y precio del revendedor.
 *  - hidden: pares del catálogo del archivo cuyo revendedor ya los vendió (o los reservó) todos.
 *  - pending: pares en stock que no se pueden publicar solos (sin modelo, sin foto, sin precio o sin talla): los completa el dueño.
 * Los pares reservados no se muestran en la web.
 */
export async function computeCatalogPlan(now: number): Promise<CatalogPlan> {
  const db = await getDb();
  const statics = await getStaticProducts();
  const [usersRes, itemsRes] = await Promise.all([
    db.execute("SELECT id, username, email, display_name FROM users WHERE role != 'admin' AND suspended = 0"),
    db.execute("SELECT id, user_id, name, brand, size, condition, status, catalog_slug, expected_price, image_url, created_at FROM items ORDER BY id"),
  ]);

  const users = new Map<number, UserRow>();
  for (const r of usersRes.rows) {
    const username = String(r.username);
    users.set(Number(r.id), {
      id: Number(r.id),
      name: String(r.display_name || username),
      keys: [username, String(r.email ?? ""), String(r.display_name ?? "")].filter(Boolean).map(loose),
    });
  }
  const userByKey = new Map<string, number>();
  for (const u of users.values()) for (const k of u.keys) if (!userByKey.has(k)) userByKey.set(k, u.id);

  const items: ItemRow[] = itemsRes.rows
    .filter((r) => users.has(Number(r.user_id)))
    .map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      name: String(r.name),
      brand: String(r.brand),
      size: String(r.size),
      condition: r.condition === "usado" ? "usado" : "nuevo",
      status: String(r.status),
      slug: String(r.catalog_slug),
      price: Number(r.expected_price),
      imageUrl: String(r.image_url),
      createdAt: Number(r.created_at),
    }));

  // Modelos del catálogo: por el slug de un par (pares con vendedor) o por el slug de grupo (lo que elige el revendedor al cargar).
  const modelBySlug = new Map<string, Product>();
  for (const p of statics) if (!modelBySlug.has(p.slug)) modelBySlug.set(p.slug, p);
  const groupModel = new Map<string, { product: Product; image: string }>();
  for (const g of groupProducts(statics)) groupModel.set(g.groupSlug, { product: g.variants[0], image: g.images[0] ?? "" });
  const resolveModel = (slug: string): { product: Product; image: string } | null => {
    const p = modelBySlug.get(slug);
    if (p) return { product: p, image: p.images[0] ?? "" };
    return groupModel.get(slug) ?? null;
  };

  // Unidades que el catálogo del archivo ya publica a nombre de cada revendedor: "usuario|modelo|talla" -> cantidad.
  const covered = new Map<string, number>();
  const byUserAssignments: { a: SellerAssignment; userId: number }[] = [];
  for (const a of assignments) {
    const userId = userByKey.get(loose(a.seller));
    if (userId === undefined) continue;
    byUserAssignments.push({ a, userId });
    for (const size of a.sizes.length ? [...new Set(a.sizes)] : [""]) {
      const key = `${userId}|${a.slug}|${normSize(size)}`;
      covered.set(key, (covered.get(key) ?? 0) + (a.counts?.[size] ?? 1));
    }
  }

  // Ocultar: el revendedor cargó el par y ya no le queda ninguna unidad en stock.
  const hidden: HiddenRow[] = [];
  for (const { a, userId } of byUserAssignments) {
    const sizes = a.sizes.length ? [...new Set(a.sizes)] : [""];
    const allGone = sizes.every((size) => {
      const mine = items.filter((i) => i.userId === userId && i.slug === a.slug && normSize(i.size) === normSize(size));
      return mine.length > 0 && mine.every((i) => i.status !== "stock");
    });
    if (allGone) hidden.push({ sku: a.sku, name: a.name, size: sizes.join(", "), sellerName: users.get(userId)?.name ?? a.seller });
  }

  // Publicar: pares en stock que el catálogo del archivo no cubre.
  const live = new Map<string, LiveRow>();
  const pending: PendingRow[] = [];
  const toPending = (i: ItemRow, reason: string) =>
    pending.push({ itemId: i.id, sellerId: i.userId, sellerName: users.get(i.userId)?.name ?? "", name: i.name, size: i.size, price: i.price, reason });

  for (const i of items) {
    if (i.status !== "stock") continue;
    const size = normSize(i.size);
    if (i.slug) {
      const key = `${i.userId}|${i.slug}|${size}`;
      const left = covered.get(key) ?? 0;
      if (left > 0) {
        covered.set(key, left - 1);
        continue;
      }
    }
    const model = i.slug ? resolveModel(i.slug) : null;
    if (!model) {
      toPending(i, i.slug ? "El modelo ya no está en el catálogo: falta foto" : "Sin modelo del catálogo: falta foto");
      continue;
    }
    if (!model.image.startsWith("/products/")) {
      toPending(i, "El modelo del catálogo no tiene foto");
      continue;
    }
    if (!(i.price >= 10_000)) {
      toPending(i, "Falta el precio");
      continue;
    }
    if (!size) {
      toPending(i, "Falta la talla");
      continue;
    }

    const m = model.product;
    const key = `${i.userId}|${m.slug}|${size}|${i.price}|${i.condition}`;
    const existing = live.get(key);
    if (existing) {
      existing.units++;
      continue;
    }
    const product: Product = {
      id: `LIVE-${i.id}`,
      slug: `${m.slug}-live-${i.id}`,
      name: m.name,
      brand: m.brand,
      ...(m.colorway ? { colorway: m.colorway } : {}),
      category: m.category,
      ...(m.subcategory ? { subcategory: m.subcategory } : {}),
      price: i.price,
      promo: false,
      sizes: [i.size.trim()],
      condition: i.condition,
      description: i.condition === "usado" ? "Usado. Comisión incluida en el precio." : "Nuevo con caja. Comisión incluida en el precio.",
      images: [model.image],
      featured: false,
      isNew: now - i.createdAt < NEW_DAYS * DAY,
      dateAdded: new Date(i.createdAt).toISOString(),
    };
    live.set(key, { product, sellerId: i.userId, sellerName: users.get(i.userId)?.name ?? "", units: 1 });
  }

  return { live: [...live.values()], hidden, pending };
}

export interface CatalogState {
  live: Map<string, { name: string; size: string; price: number }>;
  hidden: Set<string>;
  updatedAt: number | null;
}

/** Lo que la web muestra ahora (lo que dejó la última actualización). */
export async function getCatalogState(): Promise<CatalogState> {
  const db = await getDb();
  const [live, hidden, meta] = await Promise.all([
    db.execute("SELECT id, payload FROM live_listings"),
    db.execute("SELECT sku FROM catalog_hidden"),
    db.execute("SELECT updated_at FROM catalog_sync WHERE id = 1"),
  ]);
  return {
    live: new Map(
      live.rows.map((r) => {
        const p = JSON.parse(String(r.payload)) as Product;
        return [String(r.id), { name: p.name, size: p.sizes.join(", "), price: p.price }];
      })
    ),
    hidden: new Set(hidden.rows.map((r) => String(r.sku))),
    updatedAt: meta.rows[0] ? Number(meta.rows[0].updated_at) : null,
  };
}

/** Guarda el plan: desde este momento la web muestra estos pares y oculta esos SKU. */
export async function applyCatalogPlan(plan: CatalogPlan, now: number): Promise<void> {
  const db = await getDb();
  await db.batch([
    { sql: "DELETE FROM live_listings", args: [] },
    ...plan.live.map((l) => ({
      sql: "INSERT INTO live_listings (id, seller_id, payload, updated_at) VALUES (?, ?, ?, ?)",
      args: [l.product.id, l.sellerId, JSON.stringify(l.product), now],
    })),
    { sql: "DELETE FROM catalog_hidden", args: [] },
    ...plan.hidden.map((h) => ({
      sql: "INSERT OR REPLACE INTO catalog_hidden (sku, reason, updated_at) VALUES (?, ?, ?)",
      args: [h.sku, `${h.name} · ${h.sellerName}`, now],
    })),
    {
      sql: `INSERT INTO catalog_sync (id, updated_at, live, hidden, pending) VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, live = excluded.live, hidden = excluded.hidden, pending = excluded.pending`,
      args: [now, plan.live.length, plan.hidden.length, plan.pending.length],
    },
  ]);
  resetLiveOverlay();
}
