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
import NewArrivalsStrip from "@/components/NewArrivalsStrip";
import Reveal from "@/components/Reveal";
import { getFeaturedGroups, getNewArrivalGroups } from "@/lib/products";

export default async function Home() {
  const [featured, arrivals] = await Promise.all([
    getFeaturedGroups(6),
    getNewArrivalGroups(12),
  ]);

  return (
    <>
      <Hero />
      <NewArrivalsStrip groups={arrivals} />
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
      <Reveal><CTASection /></Reveal>
    </>
  );
}
