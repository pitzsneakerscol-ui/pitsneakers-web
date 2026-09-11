import { getPromoGroups } from "@/lib/products";
import { siteConfig } from "@/config/site";
import ProductGrid from "@/components/ProductGrid";
import CountdownTimer from "@/components/CountdownTimer";
import PromoGate from "@/components/PromoGate";

export default async function PromoSection() {
  if (!siteConfig.promo.enabled) return null;

  const groups = await getPromoGroups();
  if (groups.length === 0) return null;

  return (
    <PromoGate endsAt={siteConfig.promo.endsAt}>
      <section className="border-y border-line bg-paper-raised py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 rounded-2xl bg-ink px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Oferta por tiempo limitado
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
                {siteConfig.promo.title}
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/60">
                {siteConfig.promo.subtitle}
              </p>
            </div>
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-white/50 sm:text-right">
                Termina en
              </p>
              <CountdownTimer endsAt={siteConfig.promo.endsAt} />
            </div>
          </div>

          <div className="mt-10">
            <ProductGrid groups={groups} />
          </div>
        </div>
      </section>
    </PromoGate>
  );
}
