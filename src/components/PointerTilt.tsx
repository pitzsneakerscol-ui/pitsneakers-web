"use client";

import { useEffect, useRef } from "react";

/** Inclina suavemente su contenido hacia donde apunta el mouse. Solo en pantallas con mouse y sin "reducir movimiento". */
export default function PointerTilt({
  children,
  max = 10,
  className = "",
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || calm) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // Distancia al centro, normalizada y limitada a [-1, 1] para que el efecto sea sutil de lejos.
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        el.style.transform = `perspective(900px) rotateY(${dx * max}deg) rotateX(${-dy * max}deg)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.transform = "";
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [max]);

  return (
    <div ref={ref} className={`transition-transform duration-200 ease-out will-change-transform ${className}`}>
      {children}
    </div>
  );
}
