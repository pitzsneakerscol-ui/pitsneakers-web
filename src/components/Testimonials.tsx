import Link from "next/link";
import { getAllTestimonials } from "@/lib/testimonials";
import SectionHeading from "@/components/SectionHeading";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";

export default async function Testimonials({ limit }: { limit?: number }) {
  const testimonials = await getAllTestimonials();
  const items = typeof limit === "number" ? testimonials.slice(0, limit) : testimonials;

  if (items.length === 0) return null;

  const average = items.reduce((sum, t) => sum + t.rating, 0) / items.length;
  const withPhoto = items.filter((t) => t.photo).length;

  return (
    <section className="bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Reputación" title="Lo que dice la comunidad" />

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-5xl leading-none tracking-wide text-accent">{average.toFixed(1).replace(".", ",")}</span>
            <div className="leading-tight">
              <p className="text-accent" aria-hidden="true">{"★".repeat(Math.round(average))}{"☆".repeat(5 - Math.round(average))}</p>
              <p className="text-xs text-muted">
                {items.length} {items.length === 1 ? "reseña" : "reseñas"}
                {withPhoto > 0 && <> · {withPhoto} con foto</>}
              </p>
            </div>
          </div>
          <Link
            href="/resena"
            className="rounded-full border border-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-accent transition hover:bg-accent hover:text-white"
          >
            Deja tu reseña
          </Link>
        </div>

        <div className="mt-8">
          <TestimonialsCarousel testimonials={items} />
        </div>
      </div>
    </section>
  );
}
