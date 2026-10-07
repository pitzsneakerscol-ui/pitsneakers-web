"use client";

import { useRef, useState } from "react";
import { ProductGroup } from "@/types/product";
import ProductMedia from "@/components/ProductMedia";

/** Galería que se desliza con el dedo (scroll-snap); las miniaturas y los puntos siguen la foto activa. */
export default function ProductGallery({ group }: { group: ProductGroup }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const count = Math.max(group.images.length, 1);

  function goTo(index: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActive(index);
  }

  function onScroll() {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== active) setActive(Math.min(Math.max(index, 0), count - 1));
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={track}
          onScroll={onScroll}
          className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto rounded-lg bg-[#ebe8e2]"
          aria-roledescription="carrusel"
          aria-label={`Fotos de ${group.name}`}
        >
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="relative aspect-square w-full shrink-0 snap-center" aria-label={`Foto ${index + 1} de ${count}`}>
              <ProductMedia product={group} index={index} priority={index === 0} sizes="(min-width: 1024px) 50vw, 100vw" />
            </div>
          ))}
        </div>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
          Verificado por Pitsneakers
        </span>

        {count > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden" aria-hidden="true">
            {Array.from({ length: count }).map((_, index) => (
              <span key={index} className={`h-1.5 rounded-full transition-all ${active === index ? "w-5 bg-ink" : "w-1.5 bg-ink/30"}`} />
            ))}
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 hidden grid-cols-4 gap-3 sm:grid">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              className={`relative aspect-square overflow-hidden rounded-md bg-[#ebe8e2] ring-2 transition ${
                active === index ? "ring-ink" : "ring-transparent"
              }`}
              aria-label={`Ver foto ${index + 1}`}
            >
              <ProductMedia product={group} index={index} sizes="12vw" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
