"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface TrendingSlide {
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: string;
}

// Fondos de color sólido (uno por diapositiva): la foto se funde con el fondo gracias a mix-blend-multiply.
const TONES = [
  { bg: "#2a6244", ink: "#f4efe0", accent: "#ffd23f" },
  { bg: "#c84028", ink: "#fff4ea", accent: "#ffd23f" },
  { bg: "#1f3a5f", ink: "#eef3fa", accent: "#7fd1ff" },
];

// Rayitas en diagonal (como el fondo de las promos de las tiendas de sneakers).
const DASHES =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Cpath d='M44 14 52 8' stroke='%23000' stroke-opacity='.55' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E\")";

const SERIF = { fontFamily: "var(--font-serif), Georgia, 'Times New Roman', serif" } as const;

/**
 * Carrusel de destacados a todo el ancho: fondo de color, título grande, foto del par y botón.
 * Se desliza con el dedo, avanza solo cada 6 s (se detiene al tocarlo o con el mouse encima) y tiene puntos para elegir.
 */
export default function TrendingCarousel({ slides }: { slides: TrendingSlide[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [pause, setPause] = useState(false);
  const [calm, setCalm] = useState(false);
  const total = slides.length;

  useEffect(() => {
    const t = setTimeout(() => setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches), 0);
    return () => clearTimeout(t);
  }, []);

  const goTo = useCallback((i: number) => {
    const el = box.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  const onScroll = () => {
    const el = box.current;
    if (!el || el.clientWidth === 0) return;
    setAt(Math.round(el.scrollLeft / el.clientWidth));
  };

  useEffect(() => {
    if (calm || pause || total < 2) return;
    const id = setInterval(() => {
      if (!document.hidden) goTo((at + 1) % total);
    }, 6000);
    return () => clearInterval(id);
  }, [at, calm, pause, total, goTo]);

  if (total === 0) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados de Pitsneakers"
      className="relative"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onTouchStart={() => setPause(true)}
      onTouchEnd={() => setPause(false)}
      onFocusCapture={() => setPause(true)}
      onBlurCapture={() => setPause(false)}
    >
      <div ref={box} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
        {slides.map((s, i) => {
          const tone = TONES[i % TONES.length];
          const first = i === 0;
          return (
            <article
              key={s.slug}
              aria-hidden={i !== at || undefined}
              className="relative grid min-w-full snap-center grid-cols-[1fr_1fr] items-center overflow-hidden"
              style={{ background: tone.bg, color: tone.ink, backgroundImage: i === 0 ? undefined : DASHES }}
            >
              <div className="relative z-10 flex flex-col justify-center py-8 pl-5 pr-2 sm:py-14 sm:pl-10 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
                {first ? (
                  <h2 className="font-display text-[clamp(2.4rem,9vw,6.5rem)] leading-[0.92] tracking-wide">
                    AHORA<br />EN TENDENCIA
                  </h2>
                ) : (
                  <h2 className="text-[clamp(1.6rem,6.2vw,4rem)] font-medium leading-[1.05]" style={SERIF}>
                    {s.name}
                  </h2>
                )}
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80 sm:mt-4 sm:text-xs">
                  {first ? s.name : s.brand} · desde {s.price}
                </p>
                <Link
                  href={`/producto/${s.slug}`}
                  prefetch={false}
                  className={
                    first
                      ? "mt-4 w-fit text-base font-semibold underline underline-offset-4 transition hover:opacity-70 sm:mt-8 sm:text-xl"
                      : "mt-4 w-fit rounded-md bg-[#111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black sm:mt-8 sm:px-6 sm:text-base"
                  }
                >
                  Compra ahora
                </Link>
              </div>

              <div className="relative h-[220px] sm:h-[360px] lg:h-[440px]">
                <Image
                  src={s.image}
                  alt={s.name}
                  fill
                  priority={first}
                  sizes="(min-width: 1024px) 50vw, 50vw"
                  className="object-contain p-2 mix-blend-multiply sm:p-6"
                />
              </div>

              {/* Cinta vertical con el nombre de la sección, como en las tiendas de sneakers */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-9 flex-col items-center justify-around border-l border-black/40 font-mono text-[11px] uppercase tracking-[0.25em] opacity-60 sm:flex"
              >
                {[0, 1].map((k) => (
                  <span key={k} style={{ writingMode: "vertical-rl" }}>
                    Ahora en tendencia
                  </span>
                ))}
              </span>
            </article>
          );
        })}
      </div>

      {total > 1 && (
        <div className="absolute bottom-3 right-4 z-20 flex items-center gap-2 sm:bottom-5 sm:right-14" role="tablist" aria-label="Elegir destacado">
          {slides.map((s, i) => (
            <button
              key={s.slug}
              type="button"
              role="tab"
              aria-selected={i === at}
              aria-label={`Destacado ${i + 1} de ${total}`}
              onClick={() => goTo(i)}
              className={`h-3 w-3 rounded-full transition ${i === at ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
