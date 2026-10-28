import Link from "next/link";
import { getPromoGroups } from "@/lib/products";
import { siteConfig } from "@/config/site";
import { promoLive } from "@/lib/sale";
import ProductGrid from "@/components/ProductGrid";
import CountdownTimer from "@/components/CountdownTimer";
import PromoGate from "@/components/PromoGate";

const HOME_LIMIT = 8;

export default async function PromoSection() {
  if (!promoLive()) return null;

  const groups = await getPromoGroups();
  if (groups.length === 0) return null;

  const { endsAt } = siteConfig.promo;
  const section = (
    <section className="border-y border-line bg-paper-raised py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 rounded-2xl bg-ink px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {endsAt ? "Oferta por tiempo limitado" : "Rebajas de apertura"}
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
              {siteConfig.promo.title}
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/60">
              {siteConfig.promo.subtitle}
            </p>
          </div>
          {endsAt && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-white/50 sm:text-right">
                Termina en
              </p>
              <CountdownTimer endsAt={endsAt} />
            </div>
          )}
        </div>

        <div className="mt-10">
          <ProductGrid groups={groups.slice(0, HOME_LIMIT)} />
        </div>

        {groups.length > HOME_LIMIT && (
          <div className="mt-8 text-center">
            <Link
              href="/sale"
              className="inline-block rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
            >
              Ver todo el sale
            </Link>
          </div>
        )}
      </div>
    </section>
  );

  return endsAt ? <PromoGate endsAt={endsAt}>{section}</PromoGate> : section;
}
