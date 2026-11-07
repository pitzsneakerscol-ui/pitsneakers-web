import "server-only";
import { getDb } from "@/lib/db";
import { computeCatalogPlan } from "@/lib/catalog-sync";
import { loadMissingData, makeMissingZip, type CatalogModel } from "@/lib/missing-lists";
import { getStaticProducts } from "@/lib/products";
import { todayBogota } from "@/lib/reseller-shared";

/**
 * ZIP con el stock de cada revendedor que todavía no se puede publicar (falta foto, modelo, precio o talla).
 * Se cruza con el catálogo publicado: lo que ya está en la página no se pide como faltante.
 */
export async function buildMissingZip(): Promise<Buffer> {
  const db = await getDb();
  const plan = await computeCatalogPlan(Date.now());
  const data = await loadMissingData(db, plan.pending.map((p) => ({ itemId: p.itemId, reason: p.reason })));
  const catalog: CatalogModel[] = (await getStaticProducts()).map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    colorway: p.colorway,
    sizes: p.sizes,
    price: p.price,
    condition: p.condition,
    code: /c[oó]digo de estilo\s+([A-Za-z0-9-]+)/i.exec(p.description ?? "")?.[1] ?? "",
  }));
  return makeMissingZip({ ...data, catalog }, todayBogota());
}
