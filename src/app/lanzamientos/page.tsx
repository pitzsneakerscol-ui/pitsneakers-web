import type { Metadata } from "next";
import Link from "next/link";
import { getNewArrivals } from "@/lib/products";
import ProductGrid from "@/components/ProductGrid";
import CommunityNotice from "@/components/CommunityNotice";

export const metadata: Metadata = {
  title: "Lanzamientos",
  description: "Los pares y prendas más recientes en consignación con Pitsneakers.",
};

export default async function LanzamientosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const arrivals = await getNewArrivals();
  const products =
    categoria === "sneakers" || categoria === "streetwear"
      ? arrivals.filter((p) => p.category === categoria)
      : arrivals;

  const tabs = [
    { href: "/lanzamientos", label: "Todos", active: !categoria },
    { href: "/lanzamientos?categoria=sneakers", label: "Sneakers", active: categoria === "sneakers" },
    { href: "/lanzamientos?categoria=streetwear", label: "Streetwear", active: categoria === "streetwear" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Recién llegados
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">
          Lanzamientos
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          Lo más nuevo que ha entrado en consignación, verificado y listo para
          consultar.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2.5 border-y border-line py-4">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wide ${
              tab.active
                ? "border-ink bg-ink text-white"
                : "border-line bg-paper-raised text-ink hover:border-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
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
