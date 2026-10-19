"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Testimonial } from "@/types/testimonial";
import { useInView } from "@/lib/useInView";

const AUTOPLAY_MS = 4500;
const PAUSE_MS = 9000;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-accent" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true" className="rv-star" style={{ animationDelay: `${i * 70}ms` }}>
          {i < rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true">
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [wrapRef, seen] = useInView<HTMLDivElement>(0.15);
  const [zoom, setZoom] = useState<Testimonial | null>(null);
  const [progress, setProgress] = useState(0);
  const paused = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = useCallback(() => {
    const el = scrollerRef.current;
    const card = el?.querySelector("[data-card]") as HTMLElement | null;
    return card ? card.offsetWidth + 16 : (el?.clientWidth ?? 300) * 0.85;
  }, []);

  function scrollByCard(direction: "left" | "right") {
    pause(PAUSE_MS);
    scrollerRef.current?.scrollBy({ left: direction === "left" ? -step() : step(), behavior: "smooth" });
  }

  function pause(ms: number) {
    paused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      paused.current = false;
    }, ms);
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? Math.min(1, Math.max(0, Math.round((el.scrollLeft / max) * 100) / 100)) : 1);
  }

  // Avanza solo cada pocos segundos; se detiene al tocar o pasar el mouse, y respeta "reducir movimiento".
  useEffect(() => {
    if (!seen || testimonials.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el || paused.current || document.hidden) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 6;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step(), behavior: "smooth" });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [seen, testimonials.length, step]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

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

  return (
    <div ref={wrapRef} className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => pause(1500)}
        onTouchStart={() => pause(PAUSE_MS)}
        onFocus={() => pause(PAUSE_MS)}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 pt-1"
      >
        {testimonials.map((testimonial, i) => (
          <figure
            key={testimonial.id}
            data-card
            style={{ animationDelay: `${Math.min(i, 6) * 90}ms` }}
            className={`rv-card ${seen ? "rv-in" : ""} group relative flex w-[78vw] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-lg border border-line bg-paper-raised sm:w-72`}
          >
            <div className="p-6 pb-0">
              <span className="rv-quote" aria-hidden="true">“</span>
              <div className="flex items-center gap-3">
                {testimonial.photo && (
                  <button
                    type="button"
                    onClick={() => {
                      pause(PAUSE_MS);
                      setZoom(testimonial);
                    }}
                    aria-label={`Ampliar la foto de la reseña de ${testimonial.name}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-[#ebe8e2] transition hover:border-accent"
                  >
                    <Image
                      src={testimonial.photo}
                      alt={`Foto de ${testimonial.name}${testimonial.product ? ` con ${testimonial.product}` : ""}`}
                      fill
                      unoptimized={testimonial.photo.startsWith("/api/")}
                      sizes="64px"
                      className="object-cover transition duration-500 hover:scale-110"
                    />
                  </button>
                )}
                <div>
                  <Stars rating={testimonial.rating} />
                  {testimonial.photo && <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">Toca la foto para verla</p>}
                </div>
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-ink">“{testimonial.text}”</blockquote>
            </div>
            <figcaption className="flex items-center gap-3 p-6 pt-6 text-xs text-muted">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent" aria-hidden="true">
                {testimonial.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{testimonial.name}</span>
                {testimonial.product && <span className="block truncate">{testimonial.product}</span>}
              </span>
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
          <figure className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl bg-paper text-ink" onClick={(e) => e.stopPropagation()}>
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

      <div className="mt-5 flex items-center gap-4">
        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollByCard("left")}
            aria-label="Reseñas anteriores"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink hover:bg-ink hover:text-white"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard("right")}
            aria-label="Siguientes reseñas"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink hover:bg-ink hover:text-white"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>
    </div>
  );
}
