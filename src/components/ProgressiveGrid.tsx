"use client";

import { useEffect, useRef, useState } from "react";
import type { CardGroup } from "@/types/product";
import ProductCard from "@/components/ProductCard";

// Tarjetas cuya foto se pide de una vez (lo que se ve al abrir): una pantalla en celular, una fila en computador.
const EAGER = 6;

/**
 * Muestra el catálogo por tandas: carga más pares solos al acercarte al final
 * (o con el botón). Así la página no arma cientos de tarjetas e imágenes de una vez.
 */
export default function ProgressiveGrid({
  groups,
  pageSize = 24,
  className,
}: {
  groups: CardGroup[];
  pageSize?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement>(null);
  const total = groups.length;
  const done = visible >= total;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + pageSize);
      },
      { rootMargin: "1800px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, done, pageSize]);

  return (
    <>
      <div className={className}>
        {/* Sin animación de entrada: en iPhone el navegador avisa tarde de lo que entra a la pantalla y las tarjetas se quedaban en blanco mientras se deslizaba. */}
        {groups.slice(0, visible).map((group, i) => (
          <div key={group.groupSlug} className="h-full">
            <ProductCard group={group} eager={i < EAGER} />
          </div>
        ))}
      </div>
      {!done && (
        <div ref={sentinel} className="mt-12 flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-wide text-muted">
            Mostrando {visible} de {total}
          </p>
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            className="btn-pop inline-flex items-center justify-center rounded-full border border-line px-8 py-3 text-xs font-semibold uppercase tracking-wide text-ink hover:border-ink"
          >
            Ver más pares
          </button>
        </div>
      )}
    </>
  );
}
