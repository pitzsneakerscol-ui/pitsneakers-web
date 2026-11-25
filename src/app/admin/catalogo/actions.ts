"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import assignmentsJson from "@/data/assignments.json";
import { requireAdmin } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog-index";
import { AUTO_SOURCE, applyCatalogPlan, computeCatalogPlan } from "@/lib/catalog-sync";
import { getDb } from "@/lib/db";
import { getStaticProducts } from "@/lib/products";
import { sellerKeysFor } from "@/lib/seller-sync";
import type { SellerAssignment } from "@/lib/sheet-source";

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
  const ids = [...new Set(String(fd.get("ids") ?? "").split(",").map(Number))].filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  const index = catalogIndex(await getStaticProducts());
  const group = index.group(String(fd.get("slug") ?? ""));
  if (!group || ids.length === 0) redirect("/admin/catalogo?error=modelo");

  // Solo se tocan pares que de verdad están por completar.
  const plan = await computeCatalogPlan(Date.now());
  const pending = new Map(plan.pending.map((p) => [p.itemId, p]));
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
  redirect(`/admin/catalogo?enlazados=${linked}`);
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
    const res = await db.execute({
      sql: "UPDATE items SET catalog_slug = ?, image_url = CASE WHEN image_url = '' OR image_url LIKE '/products/%' THEN ? ELSE image_url END WHERE id = ? AND user_id = ? AND status = 'stock'",
      args: [r.toSlug, r.toImage, r.itemId, r.sellerId],
    });
    relinked += res.rowsAffected;
  }
  redirect(`/admin/catalogo?corregidos=${merged}-${relinked}`);
}
