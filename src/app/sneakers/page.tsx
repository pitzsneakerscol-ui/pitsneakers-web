import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductsByCategory, getBrands, getSizes } from "@/lib/products";
import { applyCatalogFilters, CatalogSearchParams } from "@/lib/filters";
import ProductGrid from "@/components/ProductGrid";
import CatalogFilters from "@/components/CatalogFilters";
import CommunityNotice from "@/components/CommunityNotice";

export const metadata: Metadata = {
  title: "Sneakers",
  description: "Catálogo de sneakers verificados en consignación — Nike, Adidas, New Balance y más.",
};

export default async function SneakersPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const [allSneakers, brands, sizes] = await Promise.all([
    getProductsByCategory("sneakers"),
    getBrands("sneakers"),
    getSizes("sneakers"),
  ]);
  const products = applyCatalogFilters(allSneakers, params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Catálogo
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">
          Sneakers
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          Todos los pares pasan por revisión física y autenticación antes de
          publicarse. Nuevo y usado, disponibles en consignación.
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
