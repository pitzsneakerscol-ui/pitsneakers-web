import type { Metadata } from "next";
import Link from "next/link";
import { getPromoGroups } from "@/lib/products";
import { groupPromo } from "@/lib/grouping";
import { siteConfig } from "@/config/site";
import { currentPromo, freeShippingLive, nowMs, upcomingCampaign } from "@/lib/sale";
import ProductGrid from "@/components/ProductGrid";
import CampaignHero from "@/components/CampaignHero";
import CommunityNotice from "@/components/CommunityNotice";

// Para que la página cambie de fase (antes / durante / después de la campaña) sola, sin esperar un redeploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Black Friday y Sale",
  description:
    "Black Friday, Cyber Monday y rebajas en Pitsneakers: sneakers y streetwear verificados con precio especial mientras dure la campaña.",
};

function Marquee({ items }: { items: string[] }) {
  const row = (
    <span className="flex shrink-0 items-center gap-6 pr-6">
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-6">
          <span>{t}</span>
          <span aria-hidden="true" className="text-[#ff5a3c]">✦</span>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden="true" className="bf-marquee mt-6 overflow-hidden rounded-full bg-[#0d0d0e] py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white ring-1 ring-white/10">
      <style>{`@media (prefers-reduced-motion: no-preference){.bf-track{animation:bf-scroll 28s linear infinite}.bf-marquee:hover .bf-track{animation-play-state:paused}}@keyframes bf-scroll{to{transform:translateX(-50%)}}`}</style>
      <div className="bf-track flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}

export default async function SalePage() {
  const promo = currentPromo();
  const soon = upcomingCampaign();
  const campaignLive = promo !== null && promo.id !== "sale";
  const groups = promo ? await getPromoGroups() : [];
  // Lo que más descuento tiene va primero.
  const sorted = [...groups].sort((a, b) => (groupPromo(b)?.discountPercent ?? 0) - (groupPromo(a)?.discountPercent ?? 0));
  const maxPct = sorted.length ? (groupPromo(sorted[0])?.discountPercent ?? 0) : 0;
  const p = siteConfig.promo;
  const name = promo?.name ?? soon?.name ?? "Black Friday";

  const grid = (
    <div className="mt-8">
      <ProductGrid groups={sorted} />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <CampaignHero
        campaigns={siteConfig.campaigns}
        fallback={promo ? { kicker: promo.kicker, title: promo.title, subtitle: promo.subtitle, endsAt: promo.endsAt } : { kicker: "Rebajas", title: p.title, subtitle: "", endsAt: "" }}
        initialNow={nowMs()}
        communityUrl={siteConfig.whatsappCommunityUrl}
        stats={campaignLive ? { pairs: sorted.length, maxPct } : undefined}
      />

      {(campaignLive || soon) && (
        <Marquee items={[name, maxPct > 0 && campaignLive ? `Hasta −${maxPct}%` : "Precios que no se repiten", "Pares verificados", freeShippingLive() ? "Envío gratis a todo el país" : "Envío a todo el país", "Recoge gratis en Bogotá"]} />
      )}

      {sorted.length > 0 ? (
        grid
      ) : (
        <div className="mt-10 rounded-2xl border border-line bg-paper-raised p-8 text-center">
          <p className="font-medium">
            {soon ? `${soon.name} todavía no arranca.` : promo ? "Estamos preparando las ofertas." : "La campaña ya terminó."}
          </p>
          <p className="mt-1 text-sm text-muted">
            {soon ? "Los pares con precio especial aparecen aquí cuando empiece." : "Mira lo más nuevo en el catálogo."}
          </p>
          <Link href="/lanzamientos" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
            Ver lanzamientos
          </Link>
        </div>
      )}

      <CommunityNotice />
    </div>
  );
}
