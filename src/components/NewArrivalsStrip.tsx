import Link from "next/link";
import Image from "next/image";
import type { ProductGroup } from "@/types/product";
import { groupPriceRange } from "@/lib/grouping";
import { formatPrice } from "@/lib/format";

function Items({ groups, hidden = false }: { groups: ProductGroup[]; hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {groups.map((g) => {
        const { min } = groupPriceRange(g);
        const img = g.images[0];
        return (
          <li key={g.groupSlug}>
            <Link
              href={`/producto/${g.groupSlug}`}
              tabIndex={hidden ? -1 : undefined}
              className="group mx-2 flex items-center gap-3 rounded-full border border-line bg-paper-raised py-1.5 pl-1.5 pr-5 transition hover:border-ink"
            >
              <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#ebe8e2]">
                {img && (
                  <Image
                    src={img}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover mix-blend-multiply transition duration-300 group-hover:scale-110"
                  />
                )}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block max-w-[11rem] truncate text-xs font-medium">{g.name}</span>
                <span className="block text-[11px] text-muted">
                  {g.variants.length > 1 ? "Desde " : ""}
                  {formatPrice(min)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Cinta con lo último que llegó: se mueve sola y se detiene al pasar el mouse. */
export default function NewArrivalsStrip({ groups: all }: { groups: ProductGroup[] }) {
  const groups = all.filter((g) => g.images.length > 0);
  if (groups.length < 3) return null;
  return (
    <section aria-label="Recién llegados" className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <p className="hidden shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Recién llegados
        </p>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
          <div className="flex w-max animate-marquee" style={{ animationDuration: `${Math.max(groups.length * 4, 30)}s` }}>
            <Items groups={groups} />
            <Items groups={groups} hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
