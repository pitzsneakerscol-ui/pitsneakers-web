"use client";

import { useEffect, useState } from "react";

export interface VipItem {
  slug: string;
  brand: string;
  name: string;
  image: string;
}

// Cuánto se queda cada par en el escenario antes de pasar al siguiente.
const SHOW_MS = 3600;

/**
 * Escaparate de los pares más codiciados: un mazo de tarjetas blancas (la foto del par ya viene sobre blanco, sin recortes),
 * la del frente flota y al pasar se va al fondo para que suba la siguiente. Pasa solo; al tocar una barrita se queda en ese par.
 * Todo el contenido está siempre en pantalla: la animación solo mueve y resalta, nunca oculta.
 */
export default function VipShowcase({ items }: { items: VipItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (paused || reduced || items.length < 2) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % items.length), SHOW_MS);
    return () => clearTimeout(t);
  }, [active, paused, reduced, items.length]);

  const current = items[active];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes vs-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes vs-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes vs-cap { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes vs-bar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        .vip-marquee { animation: vs-marquee 26s linear infinite }
        .vip-float { animation: vs-float 4.2s ease-in-out infinite }
        .vip-cap { animation: vs-cap .5s ease-out both }
        .vip-bar { transform-origin: left; animation: vs-bar linear forwards }
        @media (prefers-reduced-motion: reduce) {
          .vip-marquee, .vip-float, .vip-cap, .vip-bar { animation: none }
        }
      `}</style>

      <div aria-hidden="true" className="relative h-60 overflow-hidden sm:h-72">
        {/* Palabra gigante que corre detrás del par */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden">
          <div className="vip-marquee flex w-max whitespace-nowrap font-display text-[7rem] leading-none tracking-wide sm:text-[9rem]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="px-4 text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.14)" }}>
                ENCARGO
              </span>
            ))}
          </div>
        </div>

        {/* Mazo de tarjetas: la del frente flota; al pasar, se va al fondo y sube la siguiente */}
        {items.map((it, i) => {
          const pos = (i - active + items.length) % items.length;
          const frame =
            pos === 0
              ? { x: 0, y: 0, r: -3, s: 1, o: 1 }
              : pos === 1
                ? { x: 22, y: -8, r: 7, s: 0.9, o: 0.55 }
                : { x: -22, y: -8, r: -11, s: 0.9, o: 0.55 };
          return (
            <div
              key={it.slug}
              className="absolute left-1/2 top-1/2 aspect-[5/4] w-64 transition-all duration-700 ease-out sm:w-80"
              style={{
                zIndex: 10 - pos,
                opacity: frame.o,
                transform: `translate(calc(-50% + ${frame.x}%), calc(-50% + ${frame.y}%)) rotate(${frame.r}deg) scale(${frame.s})`,
              }}
            >
              <div className={pos === 0 ? "vip-float h-full w-full" : "h-full w-full"}>
                <div className="h-full w-full overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_rgba(0,0,0,0.55)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image} alt="" loading="eager" decoding="async" className="h-full w-full object-contain" />
                </div>
              </div>
            </div>
          );
        })}

        <span className="absolute left-0 top-0 z-20 -rotate-3 rounded-md bg-accent px-3 py-1.5 font-display text-sm tracking-widest text-white">
          SOLO POR ENCARGO
        </span>
        <span className="absolute right-0 top-1 z-20 font-display text-lg tracking-widest text-white/60">
          {pad(active + 1)}<span className="text-white/30"> / {pad(items.length)}</span>
        </span>
      </div>

      {/* Nombre del par y selector */}
      <div className="relative mt-2 flex items-end justify-between gap-4">
        <div key={current.slug} className="vip-cap min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">{current.brand}</p>
          <p className="line-clamp-2 font-display text-xl leading-tight tracking-wide sm:text-2xl">{current.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pb-1.5" role="tablist" aria-label="Pares por encargo">
          {items.map((it, i) => (
            <button
              key={it.slug}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${it.brand} ${it.name}`}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className="relative h-1.5 w-8 overflow-hidden rounded-full bg-white/20"
            >
              {i === active && (
                <span
                  key={`b-${active}-${paused}`}
                  className={`${paused || reduced ? "" : "vip-bar"} absolute inset-0 rounded-full bg-accent`}
                  style={paused || reduced ? undefined : { animationDuration: `${SHOW_MS}ms` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
