import type { Metadata } from "next";
import Link from "next/link";
import { getCampaignTeaserGroups, getPromoGroups } from "@/lib/products";
import { groupPriceRange, groupPromo } from "@/lib/grouping";
import { formatPrice } from "@/lib/format";
import type { ProductGroup } from "@/types/product";
import { siteConfig } from "@/config/site";
import { currentPromo, freeShippingLive, nowMs, upcomingCampaign } from "@/lib/sale";
import ProductGrid from "@/components/ProductGrid";
import CampaignHero from "@/components/CampaignHero";
import CommunityNotice from "@/components/CommunityNotice";
import ProductMedia from "@/components/ProductMedia";

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

/** "viernes 27 de noviembre a las 12:00 a. m." (hora de Colombia). */
function startLabel(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" }).format(d);
  const time = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }).format(d);
  return `${day.replace(",", "")} a las ${time}`;
}

/** Un par del adelanto: se ve cuál es y cuánto vale hoy, pero el precio de la oferta queda oculto hasta que arranque la campaña. */
function TeaserCard({ group, campaign }: { group: ProductGroup; campaign: string }) {
  const { min } = groupPriceRange(group);
  return (
    <Link href={`/producto/${group.groupSlug}`} prefetch={false} className="card-lift group flex h-full flex-col">
      <div className="relative aspect-square w-full overflow-hidden bg-[#ebe8e2]">
        <ProductMedia product={group} thumb className="transition duration-500 group-hover:scale-[1.04]" />
        <span className="absolute left-3 top-3 rounded-full bg-[#0d0d0e] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">Baja en {campaign}</span>
      </div>
      <p className="mt-3 truncate text-[11px] uppercase tracking-wider text-muted">{group.brand}</p>
      <h3 className="truncate text-sm font-medium text-ink">{group.name}</h3>
      <p className="mt-auto pt-2 text-xs text-muted">
        Hoy: {group.variants.length > 1 ? "desde " : ""}
        {formatPrice(min)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-accent">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span>{campaign}: $ ???.???</span>
      </p>
    </Link>
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
  // Adelanto: mientras la campaña no arranca, los pares que van a bajar de precio (sin decir a cuánto).
  const next = soon ? siteConfig.campaigns.find((c) => c.id === soon.id) : undefined;
  const teaser = next?.prices ? await getCampaignTeaserGroups(next.markup ?? 0) : [];

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

      {soon && teaser.length > 0 && (
        <section aria-labelledby="adelanto" className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Adelanto</p>
          <h2 id="adelanto" className="mt-2 font-display text-3xl uppercase tracking-wide sm:text-4xl">
            {teaser.length === 1 ? "Este par baja" : `Estos ${teaser.length} pares bajan`} de precio
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Desde el {startLabel(soon.startsAt)} tienen precio de {soon.name}, con envío incluido. El precio se revela cuando arranque: ¿cuánto crees que bajan? Cuando se acaba el par, se acaba la oferta.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {teaser.map((g) => (
              <li key={g.groupSlug}>
                <TeaserCard group={g} campaign={soon.name} />
              </li>
            ))}
          </ul>
          {sorted.length > 0 && <h2 className="mt-12 font-display text-3xl uppercase tracking-wide sm:text-4xl">En oferta hoy</h2>}
        </section>
      )}

      {sorted.length > 0 ? (
        grid
      ) : soon && teaser.length > 0 ? null : (
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
