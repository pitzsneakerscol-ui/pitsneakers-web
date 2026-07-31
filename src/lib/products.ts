import productsFallback from "@/data/products.json";
import { Product, ProductCategory, ProductGroup } from "@/types/product";
import { siteConfig } from "@/config/site";
import { fetchProductsFromSheet } from "@/lib/sheet-source";
import { groupProducts } from "@/lib/grouping";

async function loadProducts(): Promise<Product[]> {
  if (!siteConfig.productsSheetUrl) {
    return productsFallback as Product[];
  }

  try {
    const products = await fetchProductsFromSheet(siteConfig.productsSheetUrl);
    return products.length > 0 ? products : (productsFallback as Product[]);
  } catch (err) {
    console.error(
      "No se pudo leer el Google Sheet de productos, usando el respaldo local.",
      err
    );
    return productsFallback as Product[];
  }
}

export async function getAllProducts(): Promise<Product[]> {
  const products = await loadProducts();
  return [...products].sort(
    (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );
}

export async function getAllGroups(): Promise<ProductGroup[]> {
  const products = await getAllProducts();
  return groupProducts(products).sort(
    (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );
}

export async function getGroupBySlug(slug: string): Promise<ProductGroup | undefined> {
  const groups = await getAllGroups();
  return groups.find((g) => g.groupSlug === slug);
}

export async function getGroupsByCategory(
  category: ProductCategory
): Promise<ProductGroup[]> {
  const groups = await getAllGroups();
  return groups.filter((g) => g.category === category);
}

export async function getFeaturedGroups(limit = 6): Promise<ProductGroup[]> {
  const groups = await getAllGroups();
  const featured = groups.filter((g) => g.featured);
  const pool = featured.length > 0 ? featured : groups;
  return pool.slice(0, limit);
}

export async function getNewArrivalGroups(limit?: number): Promise<ProductGroup[]> {
  const groups = await getAllGroups();
  const news = groups.filter((g) => g.isNew);
  const pool = news.length > 0 ? news : groups;
  return typeof limit === "number" ? pool.slice(0, limit) : pool;
}

export async function getRelatedGroups(
  group: ProductGroup,
  limit = 4
): Promise<ProductGroup[]> {
  const groups = await getAllGroups();
  return groups
    .filter((g) => g.groupSlug !== group.groupSlug && g.category === group.category)
    .slice(0, limit);
}

export async function getBrands(category?: ProductCategory): Promise<string[]> {
  const products = await getAllProducts();
  const pool = category ? products.filter((p) => p.category === category) : products;
  return Array.from(new Set(pool.map((p) => p.brand))).sort();
}

export async function getSizes(category?: ProductCategory): Promise<string[]> {
  const products = await getAllProducts();
  const pool = category ? products.filter((p) => p.category === category) : products;
  const all = new Set<string>();
  pool.forEach((p) => p.sizes.forEach((s) => all.add(s)));
  return Array.from(all).sort((a, b) => parseFloat(a) - parseFloat(b));
}
