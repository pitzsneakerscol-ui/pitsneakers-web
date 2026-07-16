"use client";

import { useRef } from "react";
import { Testimonial } from "@/types/testimonial";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-accent" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true">
          {i < rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function TestimonialsCarousel({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: "left" | "right") {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]") as HTMLElement | null;
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.85;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {testimonials.map((testimonial) => (
          <figure
            key={testimonial.id}
            data-card
            className="flex w-[78vw] shrink-0 snap-start flex-col justify-between rounded-lg border border-line bg-paper-raised p-6 sm:w-72"
          >
            <div>
              <Stars rating={testimonial.rating} />
              <blockquote className="mt-3 text-sm leading-relaxed text-ink">
                “{testimonial.text}”
              </blockquote>
            </div>
            <figcaption className="mt-6 text-xs text-muted">
              <span className="font-medium text-ink">{testimonial.name}</span>
              {testimonial.product && <> · {testimonial.product}</>}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByCard("left")}
          aria-label="Reseñas anteriores"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
        >
          <ArrowIcon direction="left" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard("right")}
          aria-label="Siguientes reseñas"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
    </div>
  );
}
