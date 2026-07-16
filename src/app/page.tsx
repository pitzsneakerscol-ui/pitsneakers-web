import Hero from "@/components/Hero";
import SectionHeading from "@/components/SectionHeading";
import ProductGrid from "@/components/ProductGrid";
import TrustSteps from "@/components/TrustSteps";
import CategoryBanners from "@/components/CategoryBanners";
import VipCallout from "@/components/VipCallout";
import Testimonials from "@/components/Testimonials";
import AboutSection from "@/components/AboutSection";
import CommunityStats from "@/components/CommunityStats";
import CTASection from "@/components/CTASection";
import { getFeaturedProducts } from "@/lib/products";

export default function Home() {
  const featured = getFeaturedProducts(6);

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <SectionHeading
          eyebrow="Recién llegados"
          title="Destacados"
          href="/lanzamientos"
          linkLabel="Ver lanzamientos"
        />
        <div className="mt-10">
          <ProductGrid products={featured} />
        </div>
      </section>

      <TrustSteps />
      <CategoryBanners />
      <VipCallout />
      <Testimonials />
      <AboutSection />
      <CommunityStats />
      <CTASection />
    </>
  );
}
