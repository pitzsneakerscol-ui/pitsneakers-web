"use client";

import { useEffect, useState } from "react";

export interface TrackerStep {
  number: string;
  title: string;
  description: string;
  icon: string;
}

/** Rastreador del encargo: avanza solo por las etapas (como seguir un pedido); puedes tocar cualquiera. */
export default function OrderTracker({ steps }: { steps: TrackerStep[] }) {
  const [active, setActive] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % steps.length), 3200);
    return () => clearInterval(id);
  }, [manual, steps.length]);

  const pct = steps.length > 1 ? (active / (steps.length - 1)) * 100 : 0;
  const current = steps[active];

  return (
    <div>
      {/* Pista con el par "corriendo" */}
      <div className="relative px-6 pt-8 sm:px-10">
        <div className="relative h-1.5 rounded-full bg-line">
          <div className="h-full rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
          <span
            aria-hidden="true"
            className="or-runner absolute -top-7 text-2xl transition-[left] duration-700 ease-out"
            style={{ left: `calc(${pct}% - 0.8rem)` }}
          >
            👟
          </span>
          {steps.map((s, i) => {
            const on = i <= active;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => {
                  setManual(true);
                  setActive(i);
                }}
                aria-label={`Etapa ${s.number}: ${s.title}`}
                aria-current={i === active ? "step" : undefined}
                className={`absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 sm:h-11 sm:w-11 sm:text-sm ${
                  on ? "border-accent bg-accent text-white" : "border-line bg-paper text-muted hover:border-ink"
                } ${i === active ? "scale-125 shadow-[0_0_0_8px_rgb(200_64_40/0.18)]" : ""}`}
                style={{ left: `${(i / Math.max(steps.length - 1, 1)) * 100}%` }}
              >
                {on && i < active ? "✓" : s.number}
              </button>
            );
          })}
        </div>

        <ul className="mt-6 hidden grid-cols-4 text-center text-xs font-semibold uppercase tracking-wide sm:grid" aria-hidden="true">
          {steps.map((s, i) => (
            <li key={s.number} className={`transition-colors duration-300 ${i === active ? "text-accent" : "text-muted"}`}>
              {s.title.split(" ").slice(0, 3).join(" ")}
            </li>
          ))}
        </ul>
      </div>

      {/* Detalle de la etapa activa */}
      <div key={active} className="wc-panel mt-8 flex items-start gap-4 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-3xl">
          {current.icon}
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Etapa {current.number} de {String(steps.length).padStart(2, "0")}
          </p>
          <h3 className="mt-1 font-display text-2xl tracking-wide sm:text-3xl">{current.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{current.description}</p>
        </div>
      </div>
    </div>
  );
}
