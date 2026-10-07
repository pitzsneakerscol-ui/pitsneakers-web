"use client";

import { Children, useEffect, useRef, useState } from "react";

/**
 * Muestra el catálogo por tandas: carga más pares solos al acercarte al final
 * (o con el botón). Así la página no arma cientos de tarjetas e imágenes de una vez.
 */
export default function ProgressiveGrid({
  children,
  pageSize = 24,
  className,
}: {
  children: React.ReactNode;
  pageSize?: number;
  className?: string;
}) {
  const items = Children.toArray(children);
  const [visible, setVisible] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement>(null);
  const total = items.length;
  const done = visible >= total;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + pageSize);
      },
      { rootMargin: "700px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, done, pageSize]);

  return (
    <>
      <div className={className}>{items.slice(0, visible)}</div>
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
