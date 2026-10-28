import productsFallback from "@/data/products.json";
import { Product, ProductCategory, ProductGroup } from "@/types/product";
import { siteConfig } from "@/config/site";
import { fetchProductsFromSheet } from "@/lib/sheet-source";
import { groupPriceRange, groupProducts, groupPromo } from "@/lib/grouping";
import { loadLiveOverlay } from "@/lib/catalog-live";

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

/** El catálogo del archivo (o de la hoja), sin los pares en vivo ni los ocultos. */
export async function getStaticProducts(): Promise<Product[]> {
  return loadProducts();
}

export async function getAllProducts(): Promise<Product[]> {
  const base = await loadProducts();
  const { live, hidden } = await loadLiveOverlay();
  const products = [...base.filter((p) => !hidden.has(p.id)), ...live];
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
  // Los pares sin foto van al final: el catálogo abre con lo que ya se puede ver bien.
  return photosFirst(groups.filter((g) => g.category === category));
}

export async function getPromoGroups(): Promise<ProductGroup[]> {
  const groups = await getAllGroups();
  return groups.filter((g) => groupPromo(g) !== null);
}

/** Los que tienen foto van primero: la portada no debería mostrar tarjetas vacías. */
function photosFirst(groups: ProductGroup[]): ProductGroup[] {
  return [...groups.filter((g) => g.images.length > 0), ...groups.filter((g) => g.images.length === 0)];
}

// Pares que el dueño fija al inicio de Destacados (por el groupSlug del modelo), antes de los más costosos.
const FEATURED_PINNED = ["adidas-jellyfish-red", "adidas-jellyfish-storm"];

/** Destacados: primero los fijados a mano y luego los pares más costosos (por el precio de su talla más cara), solo sneakers y con foto. */
export async function getFeaturedGroups(limit = 6): Promise<ProductGroup[]> {
  const groups = await getAllGroups();
  const pool = groups.filter((g) => g.category === "sneakers" && g.images.length > 0);
  const pinned = FEATURED_PINNED.map((slug) => pool.find((g) => g.groupSlug === slug)).filter(
    (g): g is ProductGroup => g !== undefined
  );
  const rest = pool
    .filter((g) => !pinned.includes(g))
    .sort((a, b) => groupPriceRange(b).max - groupPriceRange(a).max);
  return [...pinned, ...rest].slice(0, limit);
}

// Mínimo de tarjetas en la página de lanzamientos, aunque haya pocos marcados como nuevos.
const MIN_ARRIVALS = 12;

export async function getNewArrivalGroups(limit?: number): Promise<ProductGroup[]> {
  const groups = await getAllGroups();
  const news = photosFirst(groups.filter((g) => g.isNew));
  // Los marcados como lanzamiento van primero; si son pocos, se completa con lo más reciente para que la sección no quede casi vacía.
  const min = limit ?? MIN_ARRIVALS;
  const pool =
    news.length >= min
      ? news
      : [...news, ...photosFirst(groups.filter((g) => !g.isNew)).slice(0, min - news.length)];
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
