import productsFallback from "@/data/products.json";
import { Product, ProductCategory } from "@/types/product";
import { siteConfig } from "@/config/site";
import { fetchProductsFromSheet } from "@/lib/sheet-source";

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

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getAllProducts();
  return products.find((p) => p.slug === slug);
}

export async function getProductsByCategory(
  category: ProductCategory
): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.category === category);
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const products = await getAllProducts();
  const featured = products.filter((p) => p.featured);
  const pool = featured.length > 0 ? featured : products;
  return pool.slice(0, limit);
}

export async function getNewArrivals(limit?: number): Promise<Product[]> {
  const products = await getAllProducts();
  const news = products.filter((p) => p.isNew);
  const pool = news.length > 0 ? news : products;
  return typeof limit === "number" ? pool.slice(0, limit) : pool;
}

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const products = await getAllProducts();
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, limit);
}

export async function getBrands(category?: ProductCategory): Promise<string[]> {
  const pool = category
    ? await getProductsByCategory(category)
    : await getAllProducts();
  return Array.from(new Set(pool.map((p) => p.brand))).sort();
}

export async function getSizes(category?: ProductCategory): Promise<string[]> {
  const pool = category
    ? await getProductsByCategory(category)
    : await getAllProducts();
  const all = new Set<string>();
  pool.forEach((p) => p.sizes.forEach((s) => all.add(s)));
  return Array.from(all).sort((a, b) => parseFloat(a) - parseFloat(b));
}
