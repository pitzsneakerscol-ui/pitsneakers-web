import { getAllProducts } from "@/lib/products";

export async function GET() {
  const products = await getAllProducts();

  const lite = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    colorway: p.colorway ?? null,
    category: p.category,
    price: p.price,
    condition: p.condition,
    sizes: p.sizes,
    image: p.images[0] ?? null,
  }));

  return Response.json(lite);
}
