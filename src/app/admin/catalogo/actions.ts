"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import assignmentsJson from "@/data/assignments.json";
import { requireAdmin } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog-index";
import { AUTO_SOURCE, applyCatalogPlan, computeCatalogPlan } from "@/lib/catalog-sync";
import { getDb } from "@/lib/db";
import { MODEL_PHOTO, createModel, flipDraftPhoto, getSyncProducts, saveDraftPhoto } from "@/lib/catalog-models";
import { fullTitle, looseKey } from "@/lib/catalog-match";
import { sellerKeysFor } from "@/lib/seller-sync";
import type { SellerAssignment } from "@/lib/sheet-source";
import type { ProductGroup } from "@/types/product";

const assignments = assignmentsJson as SellerAssignment[];
const normSize = (v: string) => v.trim().toLowerCase().replace(",", ".");

/** Deja la web igual al stock de los revendedores: publica los pares nuevos y oculta los que ya no tienen. */
export async function refreshCatalog(): Promise<void> {
  await requireAdmin();
  const now = Date.now();
  const plan = await computeCatalogPlan(now);
  await applyCatalogPlan(plan, now);
  // Todas las páginas del catálogo se vuelven a armar con el stock nuevo.
  revalidatePath("/", "layout");
  redirect(`/admin/catalogo?listo=${plan.live.length}-${plan.hidden.length}-${plan.pending.length}`);
}

/**
 * El dueño confirma a qué modelo del catálogo corresponden unos pares de "Por completar" (los que un revendedor escribió con otro
 * nombre). Quedan enlazados a ese modelo; se publican con la siguiente actualización del catálogo.
 */
export async function linkPending(fd: FormData): Promise<void> {
  await requireAdmin();
  const ids = parseIds(fd.get("ids"));
  const index = catalogIndex(await getSyncProducts());
  const group = index.group(String(fd.get("slug") ?? ""));
  if (!group || ids.length === 0) redirect("/admin/catalogo?error=modelo");
  // Solo se tocan pares que de verdad están por completar.
  const plan = await computeCatalogPlan(Date.now());
  const linked = await linkItems(ids, group, new Map(plan.pending.map((p) => [p.itemId, { sellerId: p.sellerId, size: p.size }])));
  redirect(`/admin/catalogo?enlazados=${linked}`);
}

const parseIds = (v: FormDataEntryValue | null) => [...new Set(String(v ?? "").split(",").map(Number))].filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);

/** Enlaza al modelo los pares de `ids` que estén en `pending`. Devuelve cuántos quedaron enlazados. */
async function linkItems(ids: number[], group: ProductGroup, pending: Map<number, { sellerId: number; size: string }>): Promise<number> {
  const image = group.images.find((u) => u.startsWith("/products/")) ?? "";
  const db = await getDb();
  const keysBySeller = new Map<number, Set<string>>();
  let linked = 0;
  for (const id of ids) {
    const row = pending.get(id);
    if (!row) continue;
    let keys = keysBySeller.get(row.sellerId);
    if (!keys) {
      const u = await db.execute({ sql: "SELECT username FROM users WHERE id = ?", args: [row.sellerId] });
      keys = u.rows[0] ? await sellerKeysFor(row.sellerId, String(u.rows[0].username)) : new Set<string>();
      keysBySeller.set(row.sellerId, keys);
    }
    // Si el catálogo ya le publica ese modelo y talla a este revendedor, el par se enlaza a esa publicación exacta; si no, al modelo.
    const mine = assignments.find(
      (a) => keys.has(a.seller) && group.variants.some((v) => v.slug === a.slug) && a.sizes.some((s) => normSize(s) === normSize(row.size))
    );
    const res = await db.execute({
      sql: "UPDATE items SET catalog_slug = ?, link_confirmed = 1, image_url = CASE WHEN image_url = '' THEN ? ELSE image_url END WHERE id = ? AND status = 'stock'",
      args: [mine?.slug ?? group.groupSlug, mine?.image || image, id],
    });
    linked += res.rowsAffected;
  }
  return linked;
}

export type PhotoResult = { ok: true; name: string; facing: "derecha" | "izquierda" | "dudosa"; background: string; flipped: boolean } | { ok: false; error: string };

/** Lo que pesa, como mucho, una foto que llega del panel (ya reducida en el navegador). */
const MAX_PHOTO_BYTES = 3_600_000;

/** Recibe la foto de un modelo que falta, la prepara (sin fondo, tamaño común, punta a la derecha) y la deja como borrador para revisarla. */
export async function uploadModelPhoto(fd: FormData): Promise<PhotoResult> {
  await requireAdmin();
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No llegó ninguna foto." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "La foto pesa demasiado. Prueba con otra o tómale captura." };
  try {
    const draft = await saveDraftPhoto(Buffer.from(await file.arrayBuffer()), fd.get("kind") !== "ropa");
    return { ok: true, ...draft };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message.startsWith("La foto") ? e.message : "No se pudo leer esa foto. Prueba con otra (JPG, PNG o WebP)." };
  }
}

/** Voltea el borrador (cuando el zapato quedó mirando a la izquierda). */
export async function flipModelPhoto(name: string): Promise<PhotoResult> {
  await requireAdmin();
  const next = await flipDraftPhoto(name);
  return next ? { ok: true, name: next, facing: "derecha", background: "", flipped: true } : { ok: false, error: "Esa foto ya no está: súbela de nuevo." };
}

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/**
 * Crea el modelo que faltaba con la foto ya revisada y le enlaza los pares de "Por completar" que lo esperaban.
 * Se publican con la siguiente actualización del catálogo.
 */
export async function createModelFromPhoto(fd: FormData): Promise<void> {
  await requireAdmin();
  const ids = parseIds(fd.get("ids"));
  const photo = clean(fd.get("photo"), 60);
  const brand = clean(fd.get("brand"), 60);
  const name = clean(fd.get("name"), 120);
  const kind = clean(fd.get("kind"), 12);
  if (ids.length === 0 || !MODEL_PHOTO.test(photo) || !brand || name.length < 3) redirect("/admin/catalogo?error=datos");

  const products = await getSyncProducts();
  const index = catalogIndex(products);
  // Si ese modelo ya existe con foto, no se crea otro igual: se enlaza a ese.
  const same = index.groups.find((g) => looseKey(g.brand) === looseKey(brand) && looseKey(fullTitle(g.name, g.colorway)) === looseKey(name) && g.images.some((u) => u.startsWith("/products/")));
  const plan = await computeCatalogPlan(Date.now());
  const pending = new Map(plan.pending.map((p) => [p.itemId, { sellerId: p.sellerId, size: p.size }]));
  if (!ids.some((id) => pending.has(id))) redirect("/admin/catalogo?enlazados=0");
  let group = same ?? null;
  if (!group) {
    const taken = new Set(products.map((p) => p.slug));
    for (const g of index.groups) taken.add(g.groupSlug);
    const model = await createModel(
      { brand, name, colorway: "", category: kind === "tenis" ? "sneakers" : "streetwear", subcategory: kind === "accesorio" ? "accesorio" : kind === "ropa" ? "ropa" : "", code: clean(fd.get("code"), 40), photo },
      (slug) => taken.has(slug)
    );
    if (!model) redirect("/admin/catalogo?error=foto");
    group = catalogIndex(await getSyncProducts()).groupOf(model.slug);
  }
  if (!group) redirect("/admin/catalogo?error=modelo");
  const linked = await linkItems(ids, group, pending);
  redirect(`/admin/catalogo?enlazados=${linked}&nuevo=${same ? 0 : 1}`);
}

/**
 * Corrige los inventarios de los revendedores:
 *  - Duplicados: borra el registro que la plataforma cargó de más y deja el que cargó el revendedor (con su costo), ya enlazado al par.
 *  - Mal enlazados: apunta el par al modelo que dicen su código o su nombre.
 * No cambia lo que se ve en la web: esos registros ya no contaban dos veces.
 */
export async function fixInventories(): Promise<void> {
  await requireAdmin();
  const plan = await computeCatalogPlan(Date.now());
  const db = await getDb();
  let merged = 0;
  for (const d of plan.duplicates) {
    // Un registro automático con fotos, ofertas o pujas ya tiene historia: no se borra solo.
    const refs = await db.execute({
      sql: `SELECT (SELECT COUNT(*) FROM item_photos WHERE item_id = ?1) + (SELECT COUNT(*) FROM used_photos WHERE item_id = ?1) + (SELECT COUNT(*) FROM item_proofs WHERE item_id = ?1)
                 + (SELECT COUNT(*) FROM offers WHERE item_id = ?1) + (SELECT COUNT(*) FROM auction_bids WHERE item_id = ?1) AS n`,
      args: [d.autoId],
    });
    if (Number(refs.rows[0]?.n ?? 0) > 0) continue;
    const res = await db.batch(
      [
        {
          sql: "UPDATE items SET catalog_slug = ?, image_url = CASE WHEN image_url = '' THEN ? ELSE image_url END WHERE id = ? AND user_id = ? AND catalog_slug = ''",
          args: [d.slug, d.image, d.handId, d.sellerId],
        },
        {
          sql: "DELETE FROM items WHERE id = ? AND user_id = ? AND source = ? AND status = 'stock' AND purchase_confirmed_at IS NULL AND sold_price IS NULL",
          args: [d.autoId, d.sellerId, AUTO_SOURCE],
        },
      ],
      "write"
    );
    merged += res[1].rowsAffected;
  }
  let relinked = 0;
  for (const r of plan.relinks) {
    // Sin modelo correcto en el catálogo (toSlug vacío) el par queda sin enlace: vuelve a "Por completar" hasta que tenga su modelo.
    const res = await db.execute({
      sql: "UPDATE items SET catalog_slug = ?, image_url = CASE WHEN image_url = '' OR image_url LIKE '/products/%' THEN ? ELSE image_url END WHERE id = ? AND user_id = ? AND status = 'stock'",
      args: [r.toSlug, r.toImage, r.itemId, r.sellerId],
    });
    relinked += res.rowsAffected;
  }
  redirect(`/admin/catalogo?corregidos=${merged}-${relinked}`);
}
