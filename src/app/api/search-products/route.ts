import { getAllGroups } from "@/lib/products";
import { groupPriceRange } from "@/lib/grouping";

export async function GET() {
  const groups = await getAllGroups();

  const lite = groups.map((g) => {
    const { min } = groupPriceRange(g);
    return {
      slug: g.groupSlug,
      name: g.name,
      brand: g.brand,
      colorway: g.colorway ?? null,
      category: g.category,
      price: min,
      multiVariant: g.variants.length > 1,
      condition: g.variants[0].condition,
      sizes: Array.from(new Set(g.variants.flatMap((v) => v.sizes))),
      image: g.images[0] ?? null,
    };
  });

  return Response.json(lite);
}
