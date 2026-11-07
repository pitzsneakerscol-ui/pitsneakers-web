import Hero from "@/components/Hero";
import SectionHeading from "@/components/SectionHeading";
import ProductGrid from "@/components/ProductGrid";
import PromoSection from "@/components/PromoSection";
import TrustSteps from "@/components/TrustSteps";
import CategoryBanners from "@/components/CategoryBanners";
import VipCallout from "@/components/VipCallout";
import ResellerSection from "@/components/ResellerSection";
import Testimonials from "@/components/Testimonials";
import CommunityStats from "@/components/CommunityStats";
import CTASection from "@/components/CTASection";
import TrendingCarousel, { type TrendingSlide } from "@/components/TrendingCarousel";
import ArrivalsCalendar from "@/components/ArrivalsCalendar";
import Reveal from "@/components/Reveal";
import { getFeaturedGroups, getNewArrivalGroups } from "@/lib/products";
import { groupPriceRange } from "@/lib/grouping";
import { formatPrice } from "@/lib/format";
import type { ChatPair } from "@/components/CTASection";
import { jsonLdString, websiteJsonLd } from "@/lib/seo";

export default async function Home() {
  const [featured, arrivals] = await Promise.all([
    getFeaturedGroups(6),
    getNewArrivalGroups(12),
  ]);

  // Pares reales (de marcas distintas) que la tienda "sube" en el chat de la comunidad.
  const candidates = arrivals.filter((g) => g.category === "sneakers" && g.images.length > 0);
  const seenBrands = new Set<string>();
  const distinct = candidates.filter((g) => {
    if (seenBrands.has(g.brand)) return false;
    seenBrands.add(g.brand);
    return true;
  });
  const picked = [...distinct, ...candidates.filter((g) => !distinct.includes(g))];
  const chatPairs: ChatPair[] = picked.slice(0, 3).map((g) => {
    const cheapest = [...g.variants].sort((x, y) => x.price - y.price)[0];
    return {
      name: g.name,
      image: g.images[0],
      size: cheapest.sizes[0] ?? "única",
      price: formatPrice(groupPriceRange(g).min),
    };
  });

  // Carrusel de destacados: los tres primeros pares de Destacados que tienen foto.
  const slides: TrendingSlide[] = featured
    .filter((g) => g.images.length > 0)
    .slice(0, 3)
    .map((g) => ({ slug: g.groupSlug, name: g.name, brand: g.brand, image: g.images[0], price: formatPrice(groupPriceRange(g).min) }));

  return (
    <>
      {/* Nombre del sitio para Google (aparece arriba del resultado en vez de la dirección). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd()) }} />
      <Hero />
      <TrendingCarousel slides={slides} />
      <ArrivalsCalendar groups={arrivals} />
      <PromoSection />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading
          eyebrow="Selección Pitsneakers"
          title="Destacados"
          href="/lanzamientos"
          linkLabel="Ver lanzamientos"
        />
        <div className="mt-10">
          <ProductGrid groups={featured} />
        </div>
      </section>

      <Reveal><TrustSteps /></Reveal>
      <CategoryBanners />
      <Reveal><Testimonials /></Reveal>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal className="grid gap-6 lg:grid-cols-2">
          <VipCallout />
          <ResellerSection />
        </Reveal>
      </section>

      <Reveal><CommunityStats /></Reveal>
      <Reveal><CTASection pairs={chatPairs} /></Reveal>
    </>
  );
}
