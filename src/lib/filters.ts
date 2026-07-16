import { Product } from "@/types/product";

export type CatalogSearchParams = {
  marca?: string;
  talla?: string;
  precio?: string;
  estado?: string;
};

export function applyCatalogFilters(
  products: Product[],
  params: CatalogSearchParams
): Product[] {
  let result = products;

  if (params.marca) {
    result = result.filter((p) => p.brand === params.marca);
  }

  if (params.talla) {
    result = result.filter((p) => p.sizes.includes(params.talla!));
  }

  if (params.estado) {
    result = result.filter((p) => p.condition === params.estado);
  }

  if (params.precio) {
    const [min, max] = params.precio.split("-").map(Number);
    result = result.filter((p) => p.price >= min && p.price <= max);
  }

  return result;
}
