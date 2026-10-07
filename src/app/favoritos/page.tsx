import type { Metadata } from "next";
import Link from "next/link";
import { getAllGroups } from "@/lib/products";
import ProductGrid from "@/components/ProductGrid";

export const metadata: Metadata = {
  title: "Mis favoritos",
  robots: { index: false, follow: true },
};

export default async function FavoritosPage({
  searchParams,
}: {
  searchParams: Promise<{ fav?: string }>;
}) {
  const { fav } = await searchParams;
  const wanted = new Set((fav ?? "").split(",").filter(Boolean).slice(0, 60));
  const groups = wanted.size > 0 ? (await getAllGroups()).filter((g) => wanted.has(g.groupSlug)) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Guardados</p>
      <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">Mis favoritos</h1>
      <p className="mt-3 text-sm text-muted">
        Los pares que marcaste con el corazón. Se guardan en este dispositivo.
      </p>

      <div className="mt-8">
        {groups.length > 0 ? (
          <ProductGrid groups={groups} />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line px-6 py-20 text-center">
            <span aria-hidden="true" className="text-4xl text-accent">♥</span>
            <p className="max-w-xs text-sm text-muted">
              Aún no tienes favoritos. Toca el corazón en cualquier par para guardarlo aquí.
            </p>
            <Link
              href="/sneakers"
              className="btn-pop inline-flex items-center justify-center rounded-full bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-wide text-white"
            >
              Ver sneakers
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
