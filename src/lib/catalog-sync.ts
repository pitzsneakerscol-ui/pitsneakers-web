import "server-only";
import assignmentsJson from "@/data/assignments.json";
import aliasesJson from "@/data/catalog-aliases.json";
import { getDb } from "@/lib/db";
import { resetLiveOverlay } from "@/lib/catalog-live";
import { catalogIndex } from "@/lib/catalog-index";
import { fullTitle, linkedByBaseNameOnly, looseKey } from "@/lib/catalog-match";
import { getStaticProducts } from "@/lib/products";
import { usedPhotoIds } from "@/lib/used-pairs";
import { usedNoteSummary } from "@/lib/used-shared";
import type { SellerAssignment } from "@/lib/sheet-source";
import type { Product, ProductGroup } from "@/types/product";

const assignments = assignmentsJson as SellerAssignment[];

/** Equivalencias que decide el dueño: pares cargados a mano con este nombre son este modelo del catálogo (src/data/catalog-aliases.json). */
const aliasSlugByName = new Map((aliasesJson as { name: string; slug: string }[]).map((a) => [looseKey(a.name), a.slug]));

/** Así quedan marcados los pares que la plataforma carga sola en el inventario de un revendedor (ver seller-sync). */
export const AUTO_SOURCE = "Cargado por Pitsneakers";

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

/** Un modelo del catálogo que se parece a lo que escribió el revendedor: lo confirma el dueño con un clic. */
export interface PendingSuggestion {
  /** Slug del grupo. */
  slug: string;
  brand: string;
  name: string;
  image: string;
}

export interface PendingRow {
  itemId: number;
  sellerId: number;
  sellerName: string;
  name: string;
  brand: string;
  colorway: string;
  /** Código que escribió el revendedor (suele ser el código de estilo). */
  sku: string;
  size: string;
  price: number;
  reason: string;
  suggestions: PendingSuggestion[];
}

/** Un par que quedó dos veces en el inventario de un revendedor: lo cargó a mano y la plataforma lo volvió a cargar por no reconocer el nombre. */
export interface DuplicateRow {
  /** El registro que cargó la plataforma: es el que sobra. */
  autoId: number;
  /** El registro que cargó el revendedor (con su costo y sus notas): es el que se conserva. */
  handId: number;
  sellerId: number;
  sellerName: string;
  /** Nombre del modelo en el catálogo. */
  model: string;
  /** Lo que escribió el revendedor. */
  typed: string;
  size: string;
  /** Slug e imagen del registro automático: pasan al registro del revendedor si no tenía. */
  slug: string;
  image: string;
}

/** Un par enlazado a un modelo que no es el suyo (mismo modelo base y talla, otro colorway): el nombre o el código dicen otra cosa. */
export interface RelinkRow {
  itemId: number;
  sellerId: number;
  sellerName: string;
  typed: string;
  size: string;
  from: string;
  /** Modelo correcto; "" si ese par todavía no tiene modelo en el catálogo (queda por completar). */
  to: string;
  toSlug: string;
  toImage: string;
}

export interface CatalogPlan {
  live: LiveRow[];
  hidden: HiddenRow[];
  pending: PendingRow[];
  duplicates: DuplicateRow[];
  relinks: RelinkRow[];
  /** Pares en stock que no se publican aparte porque el catálogo del archivo ya los muestra a nombre de su revendedor (ids del inventario). */
  covered: number[];
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
  colorway: string;
  sku: string;
  size: string;
  condition: "nuevo" | "usado";
  status: string;
  slug: string;
  source: string;
  price: number;
  imageUrl: string;
  notes: string;
  /** Pares usados: solo los "aprobado" por el dueño se publican. */
  review: string;
  /** El dueño confirmó a mano el modelo de este par. */
  confirmed: boolean;
  createdAt: number;
}

/** El modelo del catálogo de un par del inventario y cómo se llegó a él. */
interface Resolved {
  group: ProductGroup;
  /** El par del catálogo que da nombre y datos a la publicación. */
  product: Product;
  image: string;
  via: "slug" | "alias" | "codigo" | "nombre" | "nombre+1";
  /** Otros modelos que también contienen el nombre escrito (solo al emparejar por nombre). */
  others: ProductGroup[];
}

const firstPhoto = (g: ProductGroup) => g.images.find((u) => u.startsWith("/products/")) ?? g.images[0] ?? "";

/**
 * Qué debe mostrar la web según el stock de los revendedores:
 *  - live: pares en stock que todavía no están en el catálogo del archivo, con modelo y foto del catálogo y precio del revendedor.
 *  - hidden: pares del catálogo del archivo cuyo revendedor ya los vendió (o los reservó) todos.
 *  - pending: pares en stock que no se pueden publicar solos (sin modelo, sin foto, sin precio o sin talla): los completa el dueño.
 *  - duplicates / relinks: registros repetidos o mal enlazados en los inventarios; no se publican dos veces y el dueño los corrige con un botón.
 * Los pares reservados no se muestran en la web.
 */
export async function computeCatalogPlan(now: number): Promise<CatalogPlan> {
  const db = await getDb();
  const statics = await getStaticProducts();
  const index = catalogIndex(statics);
  const [usersRes, itemsRes] = await Promise.all([
    db.execute("SELECT id, username, email, display_name FROM users WHERE role != 'admin' AND suspended = 0"),
    db.execute("SELECT id, user_id, name, brand, colorway, sku, size, condition, status, catalog_slug, source, expected_price, image_url, notes, review_status, link_confirmed, created_at FROM items ORDER BY id"),
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
  const sellerName = (id: number) => users.get(id)?.name ?? "";

  const items: ItemRow[] = itemsRes.rows
    .filter((r) => users.has(Number(r.user_id)))
    .map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      name: String(r.name),
      brand: String(r.brand),
      colorway: String(r.colorway ?? ""),
      sku: String(r.sku ?? ""),
      size: String(r.size),
      condition: r.condition === "usado" ? "usado" : "nuevo",
      status: String(r.status),
      slug: String(r.catalog_slug),
      source: String(r.source ?? ""),
      price: Number(r.expected_price),
      imageUrl: String(r.image_url),
      notes: String(r.notes ?? ""),
      review: String(r.review_status ?? "aprobado"),
      confirmed: Number(r.link_confirmed ?? 0) === 1,
      createdAt: Number(r.created_at),
    }));

  const productBySlug = new Map<string, Product>();
  for (const p of statics) if (!productBySlug.has(p.slug)) productBySlug.set(p.slug, p);
  const fromGroup = (group: ProductGroup, via: Resolved["via"], others: ProductGroup[] = []): Resolved => ({ group, product: group.variants[0], image: firstPhoto(group), via, others });

  /** El modelo del catálogo por lo que el revendedor escribió: equivalencia del dueño, código de estilo o nombre (modelo + colorway). */
  const resolveTyped = (i: ItemRow): Resolved | null => {
    const aliasSlug = aliasSlugByName.get(looseKey(fullTitle(i.name, i.colorway))) ?? aliasSlugByName.get(looseKey(i.name));
    const aliasGroup = aliasSlug ? index.groupOf(aliasSlug) : null;
    if (aliasGroup) return fromGroup(aliasGroup, "alias");
    const r = index.matcher.resolve(i);
    const group = r ? index.group(r.model.slug) : null;
    if (!r || !group) return null;
    return fromGroup(group, r.how, r.others.map((o) => index.group(o.slug)).filter((g): g is ProductGroup => g !== null));
  };

  /** El modelo de un par: el que eligió al cargarlo (su slug) o, si no eligió o ese modelo ya no existe, el que dice su nombre. */
  const resolve = (i: ItemRow): Resolved | null => {
    if (i.slug) {
      const p = productBySlug.get(i.slug);
      const group = index.groupOf(i.slug);
      if (group) return { group, product: p ?? group.variants[0], image: p?.images[0] || firstPhoto(group), via: "slug", others: [] };
    }
    return resolveTyped(i);
  };

  // Unidades que el catálogo del archivo ya publica a nombre de cada revendedor: "usuario|slug del par|talla" -> cantidad.
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
  /**
   * Las llaves de cobertura de un modelo para un revendedor y una talla: sirve cualquier par del modelo en el mismo estado
   * (un usado con sus fotos no es el par nuevo que el catálogo ya publica).
   */
  const coverKeys = (userId: number, group: ProductGroup, size: string, condition: Product["condition"]) =>
    group.variants.filter((v) => v.condition === condition).map((v) => `${userId}|${v.slug}|${size}`);
  const coverLeft = (userId: number, group: ProductGroup, size: string, condition: Product["condition"]) =>
    coverKeys(userId, group, size, condition).reduce((n, k) => n + (covered.get(k) ?? 0), 0);
  /** Gasta una unidad de cobertura; primero la del par exacto al que está enlazado (esa vale sin mirar el estado, como siempre). */
  const takeCover = (i: ItemRow, r: Resolved, size: string): boolean => {
    const exact = i.slug && r.group.variants.some((v) => v.slug === i.slug) ? [`${i.userId}|${i.slug}|${size}`] : [];
    const key = [...exact, ...coverKeys(i.userId, r.group, size, i.condition)].find((k) => (covered.get(k) ?? 0) > 0);
    if (!key) return false;
    covered.set(key, (covered.get(key) ?? 0) - 1);
    return true;
  };

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

  // Pares que cuentan para la web: en stock y, si son usados, ya aprobados por el dueño (los demás los revisa en Pares usados).
  const stock = items.filter((i) => i.status === "stock" && !(i.condition === "usado" && i.review !== "aprobado"));
  const resolved = new Map<number, Resolved | null>();
  for (const i of stock) resolved.set(i.id, resolve(i));

  // Mal enlazados: el par apunta a un modelo, pero su código o su nombre son de otro (antes se enlazaba por el modelo base, sin
  // mirar el colorway, y dos pares de la misma talla quedaban cruzados). Aquí ya cuentan como lo que son; el dueño los corrige con un botón.
  const relinks: RelinkRow[] = [];
  const unlinked = new Set<number>();
  const assignedSlugs = new Map<number, Set<string>>();
  for (const { a, userId } of byUserAssignments) assignedSlugs.set(userId, (assignedSlugs.get(userId) ?? new Set<string>()).add(a.slug));
  for (const i of stock) {
    const r = resolved.get(i.id);
    if (!r || r.via !== "slug" || i.source === AUTO_SOURCE || i.confirmed) continue;
    const typed = resolveTyped(i);
    const size = normSize(i.size);
    const row = { itemId: i.id, sellerId: i.userId, sellerName: sellerName(i.userId), typed: fullTitle(i.name, i.colorway), size: i.size.trim(), from: r.group.name };
    if (typed && typed.via !== "nombre+1" && typed.group.groupSlug !== r.group.groupSlug) {
      // Si el catálogo le publica ese modelo y talla, se enlaza a ese par exacto; si no, al modelo.
      const mine = byUserAssignments.find((x) => x.userId === i.userId && typed.group.variants.some((v) => v.slug === x.a.slug) && x.a.sizes.some((sz) => normSize(sz) === size));
      relinks.push({ ...row, to: typed.group.name, toSlug: mine?.a.slug ?? typed.group.groupSlug, toImage: typed.image });
      resolved.set(i.id, typed);
    } else if (!typed && assignedSlugs.get(i.userId)?.has(i.slug) && linkedByBaseNameOnly(i, { slug: r.group.groupSlug, brand: r.group.brand, name: r.group.name, colorway: r.group.colorway })) {
      relinks.push({ ...row, to: "", toSlug: "", toImage: "" });
      resolved.set(i.id, null);
      unlinked.add(i.id);
    }
  }

  // Duplicados: el revendedor cargó el par a mano y la plataforma lo cargó otra vez (no reconoció el nombre). Sobran los registros
  // automáticos que exceden lo que el catálogo le publica a ese revendedor en ese modelo y talla; no cuentan como stock.
  const duplicates: DuplicateRow[] = [];
  const skip = new Set<number>();
  const buckets = new Map<string, { group: ProductGroup; userId: number; size: string; condition: Product["condition"]; autos: ItemRow[]; hands: ItemRow[] }>();
  for (const i of stock) {
    const r = resolved.get(i.id);
    if (!r) continue;
    const size = normSize(i.size);
    const key = `${i.userId}|${r.group.groupSlug}|${size}|${i.condition}`;
    const b = buckets.get(key) ?? { group: r.group, userId: i.userId, size, condition: i.condition, autos: [], hands: [] };
    (i.source === AUTO_SOURCE && r.via === "slug" ? b.autos : b.hands).push(i);
    buckets.set(key, b);
  }
  for (const b of buckets.values()) {
    const extra = b.autos.length + b.hands.length - coverLeft(b.userId, b.group, b.size, b.condition);
    const n = Math.min(b.autos.length, b.hands.length, Math.max(0, extra));
    for (let k = 0; k < n; k++) {
      const auto = b.autos[k];
      const hand = b.hands[k];
      skip.add(auto.id);
      duplicates.push({
        autoId: auto.id,
        handId: hand.id,
        sellerId: b.userId,
        sellerName: sellerName(b.userId),
        model: b.group.name,
        typed: fullTitle(hand.name, hand.colorway),
        size: hand.size.trim(),
        slug: auto.slug,
        image: auto.imageUrl,
      });
    }
  }

  // Publicar: pares en stock que el catálogo del archivo no cubre.
  const live = new Map<string, LiveRow>();
  const pending: PendingRow[] = [];
  const coveredIds: number[] = [];
  const suggestion = (g: ProductGroup): PendingSuggestion => ({ slug: g.groupSlug, brand: g.brand, name: fullTitle(g.name, g.colorway), image: firstPhoto(g) });
  const toPending = (i: ItemRow, reason: string, suggestions: PendingSuggestion[] = []) =>
    pending.push({ itemId: i.id, sellerId: i.userId, sellerName: sellerName(i.userId), name: i.name, brand: i.brand, colorway: i.colorway, sku: i.sku, size: i.size, price: i.price, reason, suggestions });

  // Fotos reales de los pares usados aprobados: cada uno se publica solo, con sus propias fotos.
  const usedPhotos = await usedPhotoIds(stock.filter((i) => i.condition === "usado").map((i) => i.id));

  // Primero cada par gasta la cobertura de la publicación exacta a la que está enlazado; lo que sobre lo usan después los demás
  // pares del mismo modelo. Así un par que ya estaba cubierto no le cede su lugar a otro del mismo modelo y talla.
  const isCovered = new Set<number>();
  for (const i of stock) {
    const r = resolved.get(i.id);
    if (skip.has(i.id) || !r || r.via !== "slug") continue;
    const key = `${i.userId}|${i.slug}|${normSize(i.size)}`;
    if ((covered.get(key) ?? 0) > 0 && r.group.variants.some((v) => v.slug === i.slug)) {
      covered.set(key, (covered.get(key) ?? 0) - 1);
      isCovered.add(i.id);
    }
  }

  for (const i of stock) {
    if (skip.has(i.id)) continue;
    const size = normSize(i.size);
    const model = resolved.get(i.id) ?? null;
    // Si el catálogo del archivo ya publica ese modelo y talla a nombre de este revendedor, el par ya está en la web.
    if (isCovered.has(i.id) || (model && takeCover(i, model, size))) {
      coveredIds.push(i.id);
      continue;
    }
    if (!model) {
      const similar = index.matcher
        .suggest(i, 3)
        .map((x) => index.group(x.model.slug))
        .filter((g): g is ProductGroup => g !== null && firstPhoto(g).startsWith("/products/"))
        .map(suggestion);
      toPending(i, i.slug && !unlinked.has(i.id) ? "El modelo ya no está en el catálogo: falta foto" : "Sin modelo del catálogo: falta foto", similar);
      continue;
    }
    // El nombre también cabe en otro modelo que este revendedor ya tiene publicado en esta talla ("UNC" dentro de "UNC Toe"): que el dueño diga cuál es.
    const twin = model.via === "nombre" ? model.others.find((g) => coverLeft(i.userId, g, size, i.condition) > 0) : undefined;
    if (twin) {
      toPending(i, `Puede ser «${twin.name}», que ya tiene publicado en esta talla: confirma cuál es`, [suggestion(twin), suggestion(model.group)]);
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
    const photoIds = usedPhotos.get(i.id) ?? [];
    // Un par usado con fotos propias es único: no se junta con otros iguales.
    const key = photoIds.length > 0 ? `usado|${i.id}` : `${i.userId}|${m.slug}|${size}|${i.price}|${i.condition}`;
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
      description:
        i.condition === "usado"
          ? `${usedNoteSummary(i.notes) ?? "Usado."} ${photoIds.length > 0 ? "Fotos reales del par. " : ""}Comisión incluida en el precio.`
          : "Nuevo con caja. Comisión incluida en el precio.",
      images: [model.image],
      ...(photoIds.length > 0 ? { photos: photoIds.map((id) => `/api/usados/foto/${id}`) } : {}),
      featured: false,
      isNew: now - i.createdAt < NEW_DAYS * DAY,
      dateAdded: new Date(i.createdAt).toISOString(),
    };
    live.set(key, { product, sellerId: i.userId, sellerName: sellerName(i.userId), units: 1 });
  }

  return { live: [...live.values()], hidden, pending, duplicates, relinks, covered: coveredIds };
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
