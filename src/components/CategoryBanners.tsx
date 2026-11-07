import Link from "next/link";
import Image from "next/image";
import { getAllGroups, getPromoGroups, isCollectible } from "@/lib/products";
import { groupPriceRange } from "@/lib/grouping";
import type { ProductGroup } from "@/types/product";

/** La foto de portada de cada categoría: la pieza más valiosa con foto. */
function pickCover(groups: ProductGroup[]): ProductGroup | undefined {
  return groups
    .filter((g) => g.images.length > 0)
    .sort((x, y) => groupPriceRange(y).max - groupPriceRange(x).max)[0];
}

/** Explora por categoría: una fila que se desliza, cada categoría es un cuadro con su foto y el nombre debajo. */
export default async function CategoryBanners() {
  const [all, promos] = await Promise.all([getAllGroups(), getPromoGroups()]);
  const collectibles = all.filter(isCollectible);
  const tiles = [
    { href: "/sneakers", label: "Calzado", cover: pickCover(all.filter((g) => g.category === "sneakers")) },
    { href: "/streetwear?tipo=ropa", label: "Ropa", cover: pickCover(all.filter((g) => g.subcategory === "ropa")) },
    { href: "/streetwear?tipo=accesorio", label: "Accesorios", cover: pickCover(all.filter((g) => g.subcategory === "accesorio")) },
    { href: "/coleccionables", label: "Coleccionables", cover: pickCover(collectibles) },
    { href: "/sale", label: "Ofertas", cover: pickCover(promos) },
    { href: "/lanzamientos", label: "Nuevos", cover: pickCover(all.slice(0, 12)) },
  ].filter((t) => t.cover);

  return (
    <section aria-label="Explora por categoría" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h2 className="font-display text-xl uppercase tracking-wide sm:text-3xl">Explora por categoría</h2>
      <ul className="no-scrollbar scroll-pl-4 sm:scroll-pl-0 -mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
        {tiles.map((t) => (
          <li key={t.label} className="w-[104px] shrink-0 snap-start sm:w-[140px]">
            <Link href={t.href} prefetch={false} className="group block">
              <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-[#ebe8e2]">
                <Image
                  src={t.cover!.images[0]}
                  alt=""
                  fill
                  sizes="140px"
                  className="object-contain p-2 mix-blend-multiply transition duration-500 group-hover:scale-105"
                />
              </span>
              <span className="mt-2 block truncate text-center text-sm font-medium text-ink group-hover:text-accent">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
