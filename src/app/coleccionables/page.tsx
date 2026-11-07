import { Suspense } from "react";
import type { Metadata } from "next";
import { getCollectibleGroups } from "@/lib/products";
import { applyCatalogFilters, CatalogSearchParams } from "@/lib/filters";
import { groupSizes } from "@/lib/grouping";
import ProductGrid from "@/components/ProductGrid";
import CatalogFilters from "@/components/CatalogFilters";
import CommunityNotice from "@/components/CommunityNotice";

export const metadata: Metadata = {
  title: "Coleccionables",
  description:
    "Figuras, cartas y objetos de colección verificados: Labubu, Pokémon y más. Compra en línea o por WhatsApp. Pitsneakers, Bogotá.",
};

export default async function ColeccionablesPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const all = await getCollectibleGroups();
  const brands = Array.from(new Set(all.map((g) => g.brand))).sort();
  const sizes = Array.from(new Set(all.flatMap((g) => groupSizes(g)))).sort((a, b) => parseFloat(a) - parseFloat(b));
  const groups = applyCatalogFilters(all, params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Catálogo</p>
        <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">Coleccionables</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          Figuras, cartas y objetos de colección, verificados y en consignación segura.
        </p>
      </div>

      <Suspense>
        <CatalogFilters brands={brands} sizes={sizes} />
      </Suspense>

      <div className="mt-4">
        <ProductGrid groups={groups} />
      </div>

      <CommunityNotice />
    </div>
  );
}
