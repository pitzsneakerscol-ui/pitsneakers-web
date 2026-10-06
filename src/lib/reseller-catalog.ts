import { getAllGroups } from "@/lib/products";
import { groupPriceRange } from "@/lib/grouping";
import type { CatalogEntry } from "@/components/reseller/ItemFields";

/** Catálogo público de Pitsneakers resumido para el buscador del inventario. */
export async function getCatalogEntries(): Promise<CatalogEntry[]> {
  const groups = await getAllGroups();
  return groups.map((g) => ({
    slug: g.groupSlug,
    name: g.name,
    brand: g.brand,
    colorway: g.colorway ?? "",
    image: g.images[0] ?? "",
    price: groupPriceRange(g).min,
  }));
}
