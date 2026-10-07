import { ProductGroup } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import ProgressiveGrid from "@/components/ProgressiveGrid";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4";
const PAGE_SIZE = 24;

export default function ProductGrid({
  groups,
  emptyMessage = "No encontramos pares con esos filtros. Prueba ajustando la búsqueda.",
}: {
  groups: ProductGroup[];
  emptyMessage?: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line py-24 text-center">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  const cards = groups.map((group, i) => (
    <Reveal key={group.groupSlug} delay={(i % 4) * 70} className="h-full">
      <ProductCard group={group} />
    </Reveal>
  ));

  // Las listas largas (catálogo) se cargan por tandas; las cortas se muestran completas.
  if (groups.length <= PAGE_SIZE) return <div className={GRID}>{cards}</div>;

  // La `key` reinicia el avance cuando cambian los filtros.
  const resetKey = `${groups.length}:${groups[0].groupSlug}:${groups[groups.length - 1].groupSlug}`;
  return (
    <ProgressiveGrid key={resetKey} pageSize={PAGE_SIZE} className={GRID}>
      {cards}
    </ProgressiveGrid>
  );
}
