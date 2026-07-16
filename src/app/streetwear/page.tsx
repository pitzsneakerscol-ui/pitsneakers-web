import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductsByCategory, getBrands, getSizes } from "@/lib/products";
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
    getProductsByCategory("streetwear"),
    getBrands("streetwear"),
    getSizes("streetwear"),
  ]);
  const products = applyCatalogFilters(allStreetwear, params);

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

      <div className="mt-8">
        <Suspense>
          <CatalogFilters brands={brands} sizes={sizes} />
        </Suspense>
      </div>

      <p className="mt-6 text-xs uppercase tracking-wide text-muted">
        {products.length} {products.length === 1 ? "resultado" : "resultados"}
      </p>

      <div className="mt-4">
        <ProductGrid products={products} />
      </div>

      <CommunityNotice />
    </div>
  );
}
