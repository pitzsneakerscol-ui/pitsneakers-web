import { Product, ProductCondition, ProductGroup } from "@/types/product";

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function groupKey(product: Product): string {
  return `${normalize(product.brand)}|${normalize(product.name)}|${normalize(
    product.colorway ?? ""
  )}`;
}

export function groupProducts(products: Product[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();

  for (const product of products) {
    const key = groupKey(product);
    const existing = map.get(key);

    if (existing) {
      existing.variants.push(product);
      if (existing.featured === false && product.featured) existing.featured = true;
      if (existing.isNew === false && product.isNew) existing.isNew = true;
      if (new Date(product.dateAdded) > new Date(existing.dateAdded)) {
        existing.dateAdded = product.dateAdded;
      }
      continue;
    }

    map.set(key, {
      groupSlug:
        slugify(`${product.brand}-${product.name}-${product.colorway ?? ""}`) ||
        product.slug,
      name: product.name,
      brand: product.brand,
      colorway: product.colorway,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      images: [],
      featured: !!product.featured,
      isNew: !!product.isNew,
      dateAdded: product.dateAdded,
      variants: [product],
    });
  }

  const groups = Array.from(map.values()).map((group) => ({
    ...group,
    images: Array.from(new Set(group.variants.flatMap((v) => v.images))),
  }));

  // Evita choques de URL si dos grupos distintos generan el mismo slug.
  const seen = new Map<string, number>();
  return groups.map((group) => {
    const count = seen.get(group.groupSlug) ?? 0;
    seen.set(group.groupSlug, count + 1);
    return count === 0
      ? group
      : { ...group, groupSlug: `${group.groupSlug}-${count + 1}` };
  });
}

export function groupPriceRange(group: ProductGroup): { min: number; max: number } {
  const prices = group.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function groupSizes(group: ProductGroup): string[] {
  const all = new Set<string>();
  group.variants.forEach((v) => v.sizes.forEach((s) => all.add(s)));
  return Array.from(all).sort((a, b) => parseFloat(a) - parseFloat(b));
}

export function groupConditions(group: ProductGroup): ProductCondition[] {
  return Array.from(new Set(group.variants.map((v) => v.condition)));
}

export interface GroupPromo {
  price: number;
  priceBefore: number;
  discountPercent: number;
}

/** Si al menos una variante está en promo (con un precio "antes" mayor al actual),
 * devuelve el precio promo más barato disponible. Si no, null. */
export function groupPromo(group: ProductGroup): GroupPromo | null {
  const promoVariants = group.variants.filter(
    (v) => v.promo && v.priceBefore && v.priceBefore > v.price
  );
  if (promoVariants.length === 0) return null;

  const cheapest = promoVariants.reduce((a, b) => (a.price <= b.price ? a : b));
  const priceBefore = cheapest.priceBefore!;
  const discountPercent = Math.round((1 - cheapest.price / priceBefore) * 100);
  return { price: cheapest.price, priceBefore, discountPercent };
}
