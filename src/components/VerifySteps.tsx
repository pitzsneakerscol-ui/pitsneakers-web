"use client";

import { useEffect, useState } from "react";

export interface VerifyStep {
  number: string;
  title: string;
  description: string;
}

// Cuánto se queda resaltado cada paso antes de pasar al siguiente.
const STEP_MS = 3800;

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
  "aria-hidden": true,
};

// Lupa, escudo con visto y candado: uno por paso.
const ICONS = [
  <svg key="lupa" {...iconProps}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>,
  <svg key="escudo" {...iconProps}><path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6l7-3z" /><path d="M8.8 12.2l2.2 2.2 4.2-4.4" /></svg>,
  <svg key="candado" {...iconProps}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" /></svg>,
];

/**
 * Los pasos de verificación como una línea de tiempo viva: se van resaltando uno a uno (con una barra que se llena),
 * la línea avanza hasta el paso activo y al pasar el cursor o tocar un paso se detiene en él.
 * El contenido siempre está visible: la animación solo resalta, nunca oculta nada.
 */
export default function VerifySteps({ steps }: { steps: VerifyStep[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearTimeout(t);
  }, [active, paused, reduced, steps.length]);

  const progress = steps.length > 1 ? (active / (steps.length - 1)) * 100 : 0;
  // La línea va del centro de la primera columna al centro de la última.
  const inset = `${50 / steps.length}%`;

  return (
    <div onMouseLeave={() => setPaused(false)}>
      <style>{`
        @keyframes vs-fill { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes vs-pop { 0% { transform: scale(.7) rotate(-10deg) } 60% { transform: scale(1.18) rotate(4deg) } 100% { transform: scale(1) rotate(0) } }
        .vs-bar { transform-origin: left; animation: vs-fill linear forwards }
        .vs-pop { animation: vs-pop .6s cubic-bezier(.2, 1.2, .3, 1) }
        @media (prefers-reduced-motion: reduce) { .vs-bar, .vs-pop { animation: none } }
      `}</style>

      {/* Línea de tiempo (computador): los números se encienden al llegar a cada paso. */}
      <div className="relative mb-6 hidden md:block" aria-hidden="true">
        <div className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-line" style={{ left: inset, right: inset }}>
          <div
            className="h-full rounded bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s, i) => (
            <div key={s.number} className="flex justify-center">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 font-display text-lg transition-all duration-500 ${
                  i <= active ? "border-accent bg-accent text-white" : "border-line bg-paper-raised text-muted"
                } ${i === active ? "scale-110 shadow-lg" : ""}`}
              >
                {s.number}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => {
          const on = i === active;
          return (
            <div
              key={step.number}
              tabIndex={0}
              onMouseEnter={() => {
                setActive(i);
                setPaused(true);
              }}
              onFocus={() => {
                setActive(i);
                setPaused(true);
              }}
              onBlur={() => setPaused(false)}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className={`relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-paper p-6 outline-none transition-all duration-500 focus-visible:ring-2 focus-visible:ring-accent ${
                on ? "-translate-y-1.5 border-accent shadow-xl" : "border-line"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  key={on ? `on-${active}` : "off"}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
                    on ? "vs-pop bg-accent text-white" : "bg-paper-raised text-accent"
                  }`}
                >
                  {ICONS[i % ICONS.length]}
                </span>
                <span className="font-display text-3xl text-accent md:hidden">{step.number}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>

              {/* Barra del tiempo que le queda al paso activo (no se muestra si el usuario lo fijó). */}
              {on && !paused && !reduced && (
                <span
                  key={`bar-${active}`}
                  className="vs-bar absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                  style={{ animationDuration: `${STEP_MS}ms` }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
