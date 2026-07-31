import Link from "next/link";
import { ProductGroup } from "@/types/product";
import { formatPrice } from "@/lib/format";
import { groupPriceRange, groupConditions } from "@/lib/grouping";
import ProductMedia from "@/components/ProductMedia";
import { WhatsAppButtonSmall } from "@/components/WhatsAppButton";

export default function ProductCard({ group }: { group: ProductGroup }) {
  const { min } = groupPriceRange(group);
  const conditions = groupConditions(group);
  const hasUsado = conditions.includes("usado");
  const hasNuevo = conditions.includes("nuevo");
  const cheapestVariant = group.variants.reduce((a, b) => (a.price <= b.price ? a : b));
  const multiVariant = group.variants.length > 1;

  return (
    <div className="group relative flex h-full flex-col">
      <Link
        href={`/producto/${group.groupSlug}`}
        className="relative block aspect-square w-full overflow-hidden bg-ink"
      >
        <ProductMedia
          product={group}
          className="transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {group.isNew && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              Nuevo
            </span>
          )}
          {hasUsado && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink">
              {hasNuevo ? "Nuevo y usado" : "Usado"}
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <Link href={`/producto/${group.groupSlug}`} className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-wider text-muted">
            {group.brand}
          </p>
          <h3 className="truncate text-sm font-medium text-ink">{group.name}</h3>
          <p className="truncate text-xs text-muted">{group.colorway || " "}</p>
        </Link>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <p className="text-sm font-semibold text-ink">
          {multiVariant ? `Desde ${formatPrice(min)}` : formatPrice(min)}
        </p>
        <WhatsAppButtonSmall product={cheapestVariant} />
      </div>
    </div>
  );
}
