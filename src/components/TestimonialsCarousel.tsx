"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
  const [zoom, setZoom] = useState<Testimonial | null>(null);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoom]);

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
            className="flex w-[78vw] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-lg border border-line bg-paper-raised sm:w-72"
          >
            {testimonial.photo && (
              <button
                type="button"
                onClick={() => setZoom(testimonial)}
                aria-label={`Ampliar la foto de la reseña de ${testimonial.name}`}
                className="relative block aspect-[4/5] w-full overflow-hidden bg-[#ebe8e2]"
              >
                <Image
                  src={testimonial.photo}
                  alt={`Foto de ${testimonial.name}${testimonial.product ? ` con ${testimonial.product}` : ""}`}
                  fill
                  unoptimized={testimonial.photo.startsWith("/api/")}
                  sizes="(max-width: 640px) 78vw, 288px"
                  className="object-cover transition duration-500 hover:scale-[1.03]"
                />
              </button>
            )}
            <div className="p-6 pb-0">
              <Stars rating={testimonial.rating} />
              <blockquote className="mt-3 text-sm leading-relaxed text-ink">
                “{testimonial.text}”
              </blockquote>
            </div>
            <figcaption className="p-6 pt-6 text-xs text-muted">
              <span className="font-medium text-ink">{testimonial.name}</span>
              {testimonial.product && <> · {testimonial.product}</>}
            </figcaption>
          </figure>
        ))}
      </div>

      {zoom?.photo && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Reseña de ${zoom.name}`}
        >
          <figure
            className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl bg-paper text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/5] min-h-0 w-full flex-1 bg-[#ebe8e2]">
              <Image src={zoom.photo} alt={`Foto de ${zoom.name}`} fill unoptimized={zoom.photo.startsWith("/api/")} sizes="448px" className="object-contain" />
            </div>
            <figcaption className="p-4 text-sm">
              <Stars rating={zoom.rating} />
              <p className="mt-2 leading-relaxed">“{zoom.text}”</p>
              <p className="mt-2 text-xs text-muted">
                <span className="font-medium text-ink">{zoom.name}</span>
                {zoom.product && <> · {zoom.product}</>}
              </p>
              <button
                type="button"
                onClick={() => setZoom(null)}
                className="mt-3 rounded-full border border-line px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted hover:border-ink hover:text-ink"
              >
                Cerrar
              </button>
            </figcaption>
          </figure>
        </div>
      )}

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
