"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function spinFrameUrl(slug: string, i: number) {
  return `/products/360/${slug}/${String(i + 1).padStart(2, "0")}.webp`;
}

/**
 * Visor de 360°: una serie de fotos del mismo par tomadas dando la vuelta. Al arrastrar (o con las flechas del teclado)
 * se cambia de foto y el par gira sobre su eje, como en StockX. Con el dedo, el deslizamiento vertical sigue moviendo la página.
 */
export default function Spin360({ slug, count, label }: { slug: string; count: number; label: string }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [touched, setTouched] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const ready = loaded >= count;

  // Pide todas las fotos de una vez para que el giro no se trabe al arrastrar.
  useEffect(() => {
    let alive = true;
    let done = 0;
    for (let i = 0; i < count; i++) {
      const img = new Image();
      const finish = () => {
        done++;
        if (alive) setLoaded(done);
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = spinFrameUrl(slug, i);
    }
    return () => {
      alive = false;
    };
  }, [slug, count]);

  const wrap = useCallback((n: number) => ((n % count) + count) % count, [count]);

  // Una vuelta suave al abrir, para que se note que gira. Se detiene al tocarlo y no corre si la persona pidió menos movimiento.
  useEffect(() => {
    if (!ready || touched) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0;
    const t = setInterval(() => {
      n++;
      setIndex((i) => wrap(i + 1));
      if (n >= count) clearInterval(t);
    }, 55);
    return () => clearInterval(t);
  }, [ready, touched, count, wrap]);

  function onDown(e: React.PointerEvent) {
    if (!ready) return;
    setTouched(true);
    drag.current = { x: e.clientX, start: index, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    // Arrastrar de lado a lado de la foto = una vuelta completa.
    const perFrame = el.clientWidth / count;
    const steps = Math.round((e.clientX - d.x) / perFrame);
    if (steps !== 0) d.moved = true;
    setIndex(wrap(d.start - steps));
  }
  function onUp() {
    drag.current = null;
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setTouched(true);
      setIndex((i) => wrap(i + (e.key === "ArrowRight" ? 1 : -1)));
    }
  }

  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={`Giro 360° de ${label}`}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={index + 1}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
      className="relative aspect-[3/2] w-full cursor-grab touch-pan-y select-none overflow-hidden bg-[#ebe8e2] active:cursor-grabbing"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spinFrameUrl(slug, index)} alt={`${label}, vista ${index + 1} de ${count}`} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
        {ready ? "Arrastra para girar 360°" : `Cargando 360° ${Math.round((loaded / count) * 100)}%`}
      </span>
    </div>
  );
}
