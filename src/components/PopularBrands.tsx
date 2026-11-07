import Link from "next/link";
import Image from "next/image";
import type { ProductGroup } from "@/types/product";
import { groupPriceRange } from "@/lib/grouping";

/**
 * Marcas populares: tarjetas que se deslizan de lado, cada una con la foto de un par de esa marca sobre fondo gris,
 * el nombre y cuántos modelos hay. Lleva al catálogo ya filtrado por la marca. Las marcas con más modelos van primero.
 */
export default function PopularBrands({ groups }: { groups: ProductGroup[] }) {
  const byBrand = new Map<string, ProductGroup[]>();
  for (const g of groups) {
    if (!g.brand) continue;
    byBrand.set(g.brand, [...(byBrand.get(g.brand) ?? []), g]);
  }
  const brands = [...byBrand.entries()]
    .map(([brand, list]) => {
      // La portada es el par más valioso de la marca (suele tener la mejor foto).
      const withPhoto = list.filter((g) => g.images.length > 0).sort((a, b) => groupPriceRange(b).max - groupPriceRange(a).max);
      const cover = withPhoto.find((g) => g.category === "sneakers") ?? withPhoto[0];
      const streetwear = list.filter((g) => g.category === "streetwear").length > list.length / 2;
      return { brand, count: list.length, cover, href: `/${streetwear ? "streetwear" : "sneakers"}?marca=${encodeURIComponent(brand)}` };
    })
    .filter((b) => b.cover)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  if (brands.length < 3) return null;

  return (
    <section aria-label="Marcas populares" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Marcas populares</h2>
        <Link href="/sneakers" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent">
          Ver todas<span className="hidden sm:inline"> las marcas</span>
          <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
        </Link>
      </div>

      <ul className="no-scrollbar -mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
        {brands.map((b) => (
          <li key={b.brand} className="w-[250px] shrink-0 snap-start sm:w-[300px]">
            <Link href={b.href} prefetch={false} className="group block overflow-hidden rounded-md">
              <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[#d9d9d9]">
                <Image
                  src={b.cover!.images[0]}
                  alt=""
                  fill
                  sizes="300px"
                  className="object-contain p-4 mix-blend-multiply transition duration-500 group-hover:scale-105"
                />
              </span>
              <span className="flex items-center justify-between gap-3 bg-[#f1f1f0] px-4 py-3 text-[#111]">
                <span className="min-w-0 truncate text-lg font-medium">{b.brand}</span>
                <span className="shrink-0 text-xs text-[#6b6b6b]">
                  {b.count} {b.count === 1 ? "modelo" : "modelos"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
