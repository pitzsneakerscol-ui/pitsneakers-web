import type { Metadata } from "next";
import Link from "next/link";
import { getPromoGroups } from "@/lib/products";
import { siteConfig } from "@/config/site";
import { promoLive } from "@/lib/sale";
import ProductGrid from "@/components/ProductGrid";
import CountdownTimer from "@/components/CountdownTimer";
import CommunityNotice from "@/components/CommunityNotice";

export const metadata: Metadata = {
  title: "Sale",
  description: "Rebajas de apertura de Pitsneakers: pares y prendas seleccionados con precio especial.",
};

export default async function SalePage() {
  const live = promoLive();
  const groups = live ? await getPromoGroups() : [];
  const { endsAt } = siteConfig.promo;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Rebajas de apertura
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">
            {siteConfig.promo.title}
          </h1>
          <p className="mt-3 text-sm text-muted sm:text-base">{siteConfig.promo.subtitle}</p>
        </div>
        {live && endsAt && (
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-muted sm:text-right">Termina en</p>
            <CountdownTimer endsAt={endsAt} />
          </div>
        )}
      </div>

      {groups.length > 0 ? (
        <>
          <p className="mt-8 border-t border-line pt-4 text-xs uppercase tracking-wide text-muted">
            {groups.length} {groups.length === 1 ? "par en sale" : "pares en sale"}
          </p>
          <div className="mt-4">
            <ProductGrid groups={groups} />
          </div>
        </>
      ) : (
        <div className="mt-10 rounded-2xl border border-line bg-paper-raised p-8 text-center">
          <p className="font-medium">{live ? "Estamos preparando las rebajas." : "El sale ya terminó."}</p>
          <p className="mt-1 text-sm text-muted">Mira lo más nuevo en el catálogo.</p>
          <Link href="/lanzamientos" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
            Ver lanzamientos
          </Link>
        </div>
      )}

      <CommunityNotice />
    </div>
  );
}
