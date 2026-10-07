import Link from "next/link";
import Image from "next/image";
import { getGroupsByCategory } from "@/lib/products";
import { groupPriceRange } from "@/lib/grouping";
import type { ProductGroup } from "@/types/product";

// Posición de cada par flotando (el del centro va al frente).
const SHOES = [
  "left-0 top-10 w-40 -rotate-[14deg] group-hover:-rotate-[18deg] group-hover:-translate-y-2 sm:w-52",
  "left-1/2 -ml-24 top-0 z-10 w-48 rotate-[4deg] group-hover:rotate-[1deg] group-hover:-translate-y-3 sm:-ml-32 sm:w-64",
  "right-0 top-12 w-40 rotate-[16deg] group-hover:rotate-[20deg] group-hover:-translate-y-2 sm:w-52",
];

/** Los pares más codiciados (los de mayor precio con foto), de marcas distintas: lo que se consigue por encargo. */
function pickGrails(groups: ProductGroup[]): ProductGroup[] {
  const ranked = groups
    .filter((g) => g.images.length > 0)
    .sort((a, b) => groupPriceRange(b).max - groupPriceRange(a).max);
  const picked: ProductGroup[] = [];
  const brands = new Set<string>();
  for (const g of ranked) {
    if (brands.has(g.brand)) continue;
    brands.add(g.brand);
    picked.push(g);
    if (picked.length === 3) break;
  }
  return picked;
}

export default async function VipCallout() {
  const grails = pickGrails(await getGroupsByCategory("sneakers"));

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-ink px-6 py-10 text-white sm:px-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {grails.length === 3 && (
        <div aria-hidden="true" className="relative h-52 sm:h-64">
          {/* Resplandor detrás de los pares */}
          <div
            className="glow-pulse pointer-events-none absolute left-1/2 top-4 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl sm:h-56 sm:w-96"
            style={{ background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)", opacity: 0.55 }}
          />
          <span className="absolute left-0 top-0 z-20 -rotate-3 rounded-md bg-accent px-3 py-1.5 font-display text-sm tracking-widest">
            SOLO POR ENCARGO
          </span>
          {grails.map((g, i) => (
            <div key={g.groupSlug} className={`absolute aspect-square transition duration-500 ease-out ${SHOES[i]}`}>
              <Image
                src={g.images[0]}
                alt=""
                fill
                sizes="256px"
                className="object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)]"
              />
            </div>
          ))}
        </div>
      )}

      <p className="relative mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
        Servicio VIP
      </p>
      <h2 className="relative mt-3 font-display text-3xl leading-[1] tracking-wide text-balance sm:text-4xl">
        ¿NO ENCUENTRAS TU PAR? <span className="text-accent">PÍDELO POR ENCARGO.</span>
      </h2>
      <p className="relative mt-4 max-w-md text-sm text-white/70 sm:text-base">
        Activamos nuestra red y toda la comunidad para conseguirte esos pares
        difíciles, antes de que salgan al público.
      </p>
      <div className="relative mt-7">
        <Link
          href="/encargos"
          className="btn-pop inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-ink hover:bg-white/90"
        >
          Conocer el servicio
        </Link>
      </div>
    </div>
  );
}
