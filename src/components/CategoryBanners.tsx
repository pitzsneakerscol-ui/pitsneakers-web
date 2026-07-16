import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";

const categories = [
  {
    href: "/sneakers",
    label: "Sneakers",
    description: "Jordan, Nike, Adidas, New Balance y más — nuevos y usados verificados.",
    gradient: "from-[#1a1a1a] via-[#2b2b2b] to-[#0a0a0a]",
  },
  {
    href: "/streetwear",
    label: "Streetwear",
    description: "Hoodies, jackets y piezas de colección de las marcas que sigues.",
    gradient: "from-[#2a2118] via-[#1c1712] to-[#0a0a0a]",
  },
];

export default function CategoryBanners() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <SectionHeading eyebrow="Catálogo" title="Explora por categoría" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <Link
            key={category.href}
            href={category.href}
            className={`group relative flex h-72 flex-col justify-end overflow-hidden rounded-lg bg-gradient-to-br p-8 text-white sm:h-96 ${category.gradient}`}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06] transition group-hover:opacity-[0.1]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <h3 className="font-display text-4xl tracking-wide transition group-hover:text-accent sm:text-5xl">
              {category.label}
            </h3>
            <p className="relative mt-2 max-w-xs text-sm text-white/70">
              {category.description}
            </p>
            <span className="relative mt-4 inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-widest">
              Ver todo →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
