import Link from "next/link";
import Image from "next/image";
import { getCollectibleGroups, getGroupsByCategory } from "@/lib/products";
import { groupPriceRange } from "@/lib/grouping";
import type { ProductGroup } from "@/types/product";

/** La foto de portada de cada categoría: el par o prenda más valioso con foto (en ropa se prefieren hoodies y camisetas). */
function pickCover(groups: ProductGroup[]): ProductGroup | undefined {
  return groups
    .filter((g) => g.images.length > 0)
    .sort(
      (x, y) =>
        Number(y.subcategory === "ropa") - Number(x.subcategory === "ropa") ||
        groupPriceRange(y).max - groupPriceRange(x).max
    )[0];
}

/** Explora por categoría: tarjetas pequeñas, una foto y el nombre. */
export default async function CategoryBanners() {
  const [sneakers, streetwear, collectibles] = await Promise.all([
    getGroupsByCategory("sneakers"),
    getGroupsByCategory("streetwear"),
    getCollectibleGroups(),
  ]);
  const categories = [
    { href: "/sneakers", label: "Sneakers", cover: pickCover(sneakers) },
    { href: "/streetwear", label: "Streetwear", cover: pickCover(streetwear) },
    { href: "/coleccionables", label: "Coleccionables", cover: pickCover(collectibles) },
  ];

  return (
    <section aria-label="Explora por categoría" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h2 className="font-display text-xl uppercase tracking-wide sm:text-3xl">Explora por categoría</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-3xl sm:grid-cols-3 sm:gap-4">
        {categories.map((category, i) => (
          <Link
            key={category.href}
            href={category.href}
            className={`group block overflow-hidden rounded-xl border border-line bg-paper-raised transition hover:border-ink ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <span className={`relative block w-full bg-[#ebe8e2] ${i === 2 ? "aspect-[4/1] sm:aspect-[4/3]" : "aspect-[4/3]"}`}>
              {category.cover && (
                <Image
                  src={category.cover.images[0]}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 336px, 50vw"
                  className="object-contain p-3 mix-blend-multiply transition duration-500 group-hover:scale-105"
                />
              )}
            </span>
            <span className="flex items-center justify-between gap-2 px-3 py-2.5">
              <span className="font-display text-lg uppercase tracking-wide">{category.label}</span>
              <span aria-hidden="true" className="text-accent transition group-hover:translate-x-1">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
