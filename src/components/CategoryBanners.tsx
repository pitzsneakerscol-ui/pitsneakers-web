import Link from "next/link";
import Image from "next/image";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import { getGroupsByCategory } from "@/lib/products";
import type { ProductCategory, ProductGroup } from "@/types/product";

const categories: {
  href: string;
  label: string;
  category: ProductCategory;
  description: string;
}[] = [
  {
    href: "/sneakers",
    label: "Sneakers",
    category: "sneakers",
    description: "Jordan, Nike, Adidas, New Balance y más — nuevos y usados verificados.",
  },
  {
    href: "/streetwear",
    label: "Streetwear",
    category: "streetwear",
    description: "Hoodies, jackets y piezas de colección de las marcas que sigues.",
  },
];

// Posición de cada foto en el abanico (la del centro va al frente).
const TILES = [
  "left-0 top-6 h-36 w-36 -rotate-[8deg] group-hover:-translate-y-2 group-hover:-rotate-[11deg] sm:h-44 sm:w-44",
  "left-1/2 -ml-[5.5rem] top-0 z-10 h-44 w-44 rotate-[3deg] group-hover:-translate-y-3 group-hover:rotate-[1deg] sm:-ml-[7rem] sm:h-56 sm:w-56",
  "right-0 top-8 h-36 w-36 rotate-[10deg] group-hover:-translate-y-2 group-hover:rotate-[13deg] sm:h-44 sm:w-44",
];

/** Tres fotos de marcas distintas, para que la tarjeta muestre variedad. */
function pickShowcase(groups: ProductGroup[]): ProductGroup[] {
  // En streetwear se prefiere ropa (hoodies, camisetas) sobre accesorios: se ve mejor en la tarjeta.
  const withPhoto = groups
    .filter((g) => g.images.length > 0)
    .sort((x, y) => Number(y.subcategory === "ropa") - Number(x.subcategory === "ropa"));
  const picked: ProductGroup[] = [];
  const brands = new Set<string>();
  for (const g of withPhoto) {
    if (brands.has(g.brand)) continue;
    brands.add(g.brand);
    picked.push(g);
    if (picked.length === 3) break;
  }
  for (const g of withPhoto) {
    if (picked.length === 3) break;
    if (!picked.includes(g)) picked.push(g);
  }
  return picked;
}

export default async function CategoryBanners() {
  const showcases = await Promise.all(
    categories.map(async (c) => pickShowcase(await getGroupsByCategory(c.category)))
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading eyebrow="Catálogo" title="Explora por categoría" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {categories.map((category, i) => (
          <Reveal key={category.href} delay={i * 120} className="h-full">
            <Link
              href={category.href}
              className="card-lift group relative flex flex-col gap-6 overflow-hidden rounded-lg bg-[#ebe8e2] p-6 sm:p-8"
            >
              {/* Palabra gigante de fondo */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-3 top-3 select-none font-display text-[7rem] leading-none tracking-wide text-ink/[0.06] sm:text-[10rem]"
              >
                {category.label.toUpperCase()}
              </span>

              {/* Abanico de fotos */}
              <div aria-hidden="true" className="relative mt-1 h-48 sm:h-60">
                {showcases[i].map((g, t) => (
                  <div
                    key={g.groupSlug}
                    className={`absolute overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 transition duration-500 ease-out ${TILES[t]}`}
                  >
                    <Image
                      src={g.images[0]}
                      alt=""
                      fill
                      sizes="224px"
                      className="object-contain p-2 mix-blend-multiply"
                    />
                  </div>
                ))}
              </div>

              <div className="relative">
                <h3 className="font-display text-4xl tracking-wide text-ink transition group-hover:text-accent sm:text-5xl">
                  {category.label}
                </h3>
                <p className="mt-2 max-w-xs text-sm text-muted">{category.description}</p>
                <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition group-hover:bg-accent">
                  Ver todo
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
