import type { Metadata } from "next";
import Link from "next/link";
import { getPromoGroups } from "@/lib/products";
import { siteConfig } from "@/config/site";
import { currentPromo, nowMs, upcomingCampaign } from "@/lib/sale";
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

export default async function SalePage() {
  const promo = currentPromo();
  const soon = upcomingCampaign();
  const groups = promo ? await getPromoGroups() : [];
  const p = siteConfig.promo;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <CampaignHero
        campaigns={siteConfig.campaigns}
        fallback={promo ? { kicker: promo.kicker, title: promo.title, subtitle: promo.subtitle, endsAt: promo.endsAt } : { kicker: "Rebajas", title: p.title, subtitle: "", endsAt: "" }}
        initialNow={nowMs()}
        communityUrl={siteConfig.whatsappCommunityUrl}
      />

      {groups.length > 0 ? (
        <div className="mt-10">
          <ProductGrid groups={groups} />
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-line bg-paper-raised p-8 text-center">
          <p className="font-medium">
            {soon ? `${soon.name} todavía no arranca.` : promo ? "Estamos preparando las rebajas." : "La campaña ya terminó."}
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
