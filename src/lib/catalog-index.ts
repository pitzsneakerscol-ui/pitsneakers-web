import { createMatcher, type Matcher } from "@/lib/catalog-match";
import { groupProducts } from "@/lib/grouping";
import type { Product, ProductGroup } from "@/types/product";

/** El catálogo agrupado por modelo, con su emparejador de nombres. */
export interface CatalogIndex {
  groups: ProductGroup[];
  /** Empareja lo que escribió un revendedor con un modelo: `model.slug` es el slug del grupo. */
  matcher: Matcher;
  /** El modelo de un slug, sea el de un par del catálogo o el del grupo (el que elige el revendedor al cargar). */
  groupOf(slug: string): ProductGroup | null;
  /** El modelo por su slug de grupo (lo que devuelve el emparejador). */
  group(groupSlug: string): ProductGroup | null;
}

const styleCode = (p: Product) => /c[oó]digo de estilo\s+([A-Za-z0-9-]+)/i.exec(p.description ?? "")?.[1] ?? "";

const cache = new WeakMap<Product[], CatalogIndex>();

export function catalogIndex(products: Product[]): CatalogIndex {
  const hit = cache.get(products);
  if (hit) return hit;
  const groups = groupProducts(products);
  const bySlug = new Map<string, ProductGroup>();
  // Primero los slugs de cada par; el slug de grupo solo si no choca con el de un par de otro modelo.
  for (const g of groups) for (const v of g.variants) if (!bySlug.has(v.slug)) bySlug.set(v.slug, g);
  for (const g of groups) if (!bySlug.has(g.groupSlug)) bySlug.set(g.groupSlug, g);
  const byGroupSlug = new Map(groups.map((g) => [g.groupSlug, g]));
  const index: CatalogIndex = {
    groups,
    matcher: createMatcher(
      groups.map((g) => ({
        slug: g.groupSlug,
        brand: g.brand,
        name: g.name,
        colorway: g.colorway,
        codes: [...new Set(g.variants.map(styleCode).filter(Boolean))],
      }))
    ),
    groupOf: (slug) => bySlug.get(slug) ?? null,
    group: (groupSlug) => byGroupSlug.get(groupSlug) ?? null,
  };
  cache.set(products, index);
  return index;
}
