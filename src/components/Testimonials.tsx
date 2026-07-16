import { getAllTestimonials } from "@/lib/testimonials";
import SectionHeading from "@/components/SectionHeading";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";

export default function Testimonials({ limit }: { limit?: number }) {
  const testimonials = getAllTestimonials();
  const items = typeof limit === "number" ? testimonials.slice(0, limit) : testimonials;

  if (items.length === 0) return null;

  return (
    <section className="bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Reputación" title="Lo que dice la comunidad" />

        <div className="mt-10">
          <TestimonialsCarousel testimonials={items} />
        </div>
      </div>
    </section>
  );
}
