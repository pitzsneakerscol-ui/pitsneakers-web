import Link from "next/link";
import Image from "next/image";
import type { ProductGroup } from "@/types/product";
import { groupPriceRange } from "@/lib/grouping";
import { formatPrice } from "@/lib/format";
import FavoriteButton from "@/components/FavoriteButton";

const SERIF = { fontFamily: "var(--font-serif), Georgia, 'Times New Roman', serif" } as const;

/** Fecha de llegada en hora de Bogotá ("nov", "7"); si el par viene de la hoja y no tiene fecha real, devuelve null. */
function arrival(iso: string): { month: string; day: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2024) return null;
  const parts = new Intl.DateTimeFormat("es-CO", { month: "short", day: "numeric", timeZone: "America/Bogota" }).formatToParts(d);
  return {
    month: (parts.find((p) => p.type === "month")?.value ?? "").replace(".", ""),
    day: parts.find((p) => p.type === "day")?.value ?? "",
  };
}

/**
 * Calendario de llegadas: tarjetas que se deslizan de lado, con la fecha en que llegó cada par, su foto, si es nuevo o usado
 * (todos verificados) y el precio. Los más recientes primero.
 */
export default function ArrivalsCalendar({ groups }: { groups: ProductGroup[] }) {
  const list = groups
    .filter((g) => g.images.length > 0)
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 10);
  if (list.length < 3) return null;

  return (
    <section aria-label="Calendario de llegadas" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Calendario de llegadas</h2>
        <Link href="/lanzamientos" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent">
          Ver todo
          <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
        </Link>
      </div>

      <ul className="no-scrollbar -mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
        {list.map((g) => {
          const when = arrival(g.dateAdded);
          const cond = g.variants[0]?.condition === "usado" ? "Usado" : "Nuevo";
          const { min } = groupPriceRange(g);
          return (
            <li key={g.groupSlug} className="w-[210px] shrink-0 snap-start sm:w-[240px]">
              <div className="group relative h-full rounded-2xl border border-line bg-paper-raised p-3 transition hover:border-ink">
                <FavoriteButton slug={g.groupSlug} name={g.name} />
                <p className="flex h-10 items-center gap-2 text-[26px] leading-none text-ink" style={SERIF}>
                  {when ? (
                    <>
                      <span>{when.month}</span>
                      <span aria-hidden="true" className="h-6 w-px bg-line" />
                      <span>{when.day}</span>
                    </>
                  ) : (
                    <span className="text-[22px]">Recién llegado</span>
                  )}
                </p>
                <Link href={`/producto/${g.groupSlug}`} prefetch={false} className="mt-1 block">
                  <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#ebe8e2]">
                    <Image
                      src={g.images[0]}
                      alt={g.name}
                      fill
                      sizes="240px"
                      className="object-contain p-2 mix-blend-multiply transition duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="mt-3 line-clamp-3 block min-h-[3.9rem] text-[15px] leading-snug text-ink">{g.name}</span>
                  <span className="mt-1 block text-xs text-muted">{cond} y verificado</span>
                  <span className="mt-1 block text-lg font-semibold text-ink">
                    {g.variants.length > 1 ? "Desde " : ""}
                    {formatPrice(min)}
                  </span>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
