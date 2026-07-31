import { ProductGroup } from "@/types/product";
import { groupPriceRange, groupSizes } from "@/lib/grouping";

export type CatalogSearchParams = {
  marca?: string;
  talla?: string;
  precio?: string;
  estado?: string;
};

export function applyCatalogFilters(
  groups: ProductGroup[],
  params: CatalogSearchParams
): ProductGroup[] {
  let result = groups;

  if (params.marca) {
    result = result.filter((g) => g.brand === params.marca);
  }

  if (params.talla) {
    result = result.filter((g) => groupSizes(g).includes(params.talla!));
  }

  if (params.estado) {
    result = result.filter((g) =>
      g.variants.some((v) => v.condition === params.estado)
    );
  }

  if (params.precio) {
    const [min, max] = params.precio.split("-").map(Number);
    result = result.filter((g) => {
      const range = groupPriceRange(g);
      return range.min <= max && range.max >= min;
    });
  }

  return result;
}
