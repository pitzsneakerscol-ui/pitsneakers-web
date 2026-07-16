import productsData from "@/data/products.json";
import { Product, ProductCategory } from "@/types/product";

const products = productsData as Product[];

export function getAllProducts(): Product[] {
  return [...products].sort(
    (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return getAllProducts().filter((p) => p.category === category);
}

export function getFeaturedProducts(limit = 6): Product[] {
  const featured = getAllProducts().filter((p) => p.featured);
  const pool = featured.length > 0 ? featured : getAllProducts();
  return pool.slice(0, limit);
}

export function getNewArrivals(limit?: number): Product[] {
  const news = getAllProducts().filter((p) => p.isNew);
  const pool = news.length > 0 ? news : getAllProducts();
  return typeof limit === "number" ? pool.slice(0, limit) : pool;
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return getAllProducts()
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, limit);
}

export function getBrands(category?: ProductCategory): string[] {
  const pool = category ? getProductsByCategory(category) : getAllProducts();
  return Array.from(new Set(pool.map((p) => p.brand))).sort();
}

export function getSizes(category?: ProductCategory): string[] {
  const pool = category ? getProductsByCategory(category) : getAllProducts();
  const all = new Set<string>();
  pool.forEach((p) => p.sizes.forEach((s) => all.add(s)));
  return Array.from(all).sort((a, b) => parseFloat(a) - parseFloat(b));
}
