"use client";

import { useEffect, useRef, useState } from "react";

export interface TimelineStep {
  number: string;
  title: string;
  description: string;
}

/** Línea de tiempo vertical: la línea roja se llena y cada paso se enciende a medida que bajas. */
export default function VerifyTimeline({ steps }: { steps: TimelineStep[] }) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [reached, setReached] = useState(-1); // último paso ya alcanzado
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const raf = requestAnimationFrame(() => setArmed(true));
    // Un paso se "alcanza" cuando cruza el 65 % de la altura de la pantalla.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.i);
          if (e.isIntersecting) setReached((r) => Math.max(r, i));
        }
      },
      { rootMargin: "0px 0px -35% 0px", threshold: 0.1 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const fill = steps.length > 1 ? Math.max(0, reached) / (steps.length - 1) : 0;

  return (
    <ol className={`vt relative ${armed ? "vt-armed" : ""}`}>
      {/* Riel y relleno */}
      <span aria-hidden="true" className="absolute bottom-6 left-[1.4rem] top-6 w-0.5 bg-line sm:left-7" />
      <span
        aria-hidden="true"
        className="absolute left-[1.4rem] top-6 w-0.5 origin-top bg-accent shadow-[0_0_10px_var(--color-accent)] transition-transform duration-700 ease-out sm:left-7"
        style={{ height: "calc(100% - 3rem)", transform: `scaleY(${fill})` }}
      />

      {steps.map((s, i) => {
        const on = i <= reached;
        const current = i === reached;
        return (
          <li
            key={s.number}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-i={i}
            className="vt-step relative flex gap-4 pb-8 last:pb-0 sm:gap-6"
            style={{ ["--i" as string]: i }}
          >
            <span
              className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-display text-lg transition-all duration-500 sm:h-14 sm:w-14 sm:text-xl ${
                on ? "border-accent bg-accent text-white" : "border-line bg-paper text-muted"
              } ${current ? "scale-110 shadow-[0_0_0_8px_rgb(200_64_40/0.18)]" : ""}`}
            >
              {s.number}
            </span>
            <div
              className={`flex-1 rounded-xl border bg-paper-raised p-5 transition-all duration-500 sm:p-6 ${
                current ? "border-accent shadow-lg" : "border-line"
              } ${on ? "opacity-100" : "opacity-60"}`}
            >
              <h3 className="font-display text-xl tracking-wide sm:text-2xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
