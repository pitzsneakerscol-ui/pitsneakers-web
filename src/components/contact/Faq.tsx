"use client";

import { useState } from "react";

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

/** Preguntas frecuentes: una abierta a la vez, con apertura suave. */
export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper-raised">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <li key={it.q}>
            <button
              type="button"
              aria-expanded={on}
              aria-controls={`faq-${i}`}
              onClick={() => setOpen(on ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-paper sm:px-6 sm:py-5"
            >
              <span className={`text-sm font-semibold transition-colors sm:text-base ${on ? "text-accent" : ""}`}>{it.q}</span>
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg leading-none transition-all duration-300 ${
                  on ? "rotate-45 border-accent bg-accent text-white" : "border-line"
                }`}
              >
                +
              </span>
            </button>
            <div
              id={`faq-${i}`}
              role="region"
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: on ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6">{it.a}</div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
