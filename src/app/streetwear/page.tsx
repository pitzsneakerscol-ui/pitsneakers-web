import { Suspense } from "react";
import type { Metadata } from "next";
import { getGroupsByCategory, getBrands, getSizes } from "@/lib/products";
import { applyCatalogFilters, CatalogSearchParams } from "@/lib/filters";
import ProductGrid from "@/components/ProductGrid";
import CatalogFilters from "@/components/CatalogFilters";
import CommunityNotice from "@/components/CommunityNotice";

export const metadata: Metadata = {
  title: "Streetwear",
  description: "Catálogo de streetwear verificado en consignación — hoodies, jackets, pantalones y más.",
};

export default async function StreetwearPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const [allStreetwear, brands, sizes] = await Promise.all([
    getGroupsByCategory("streetwear"),
    getBrands("streetwear"),
    getSizes("streetwear"),
  ]);
  const groups = applyCatalogFilters(allStreetwear, params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Catálogo
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">
          Streetwear
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          Piezas verificadas de las marcas que sigues, en consignación segura.
        </p>
      </div>

      <div
        role="status"
        className="mt-8 flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 sm:items-center sm:px-5"
      >
        <span className="text-lg leading-none" aria-hidden="true">🚧</span>
        <p className="text-sm text-ink">
          <strong className="font-semibold">Categoría en proceso.</strong>{" "}
          Estamos subiendo más prendas poco a poco; pronto habrá más para ver.
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
