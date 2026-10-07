"use client";

import { useEffect, useState } from "react";

const ITEMS = [
  { key: "Costuras", icon: "🧵", color: "#ff5a3c", text: "Que la puntada sea pareja, sin hilos sueltos ni desvíos. Cada marca tiene un patrón de costura propio y lo comparamos." },
  { key: "Etiquetas", icon: "🏷️", color: "#ffd23f", text: "Tipografía, códigos, tallas impresas y lugar de fabricación. Una etiqueta fuera de lugar detiene el proceso." },
  { key: "Materiales", icon: "👟", color: "#3ddc84", text: "Tacto, grosor y acabado del cuero, la malla, la espuma o la tela. Los originales se sienten distinto." },
  { key: "Empaque", icon: "📦", color: "#4cc9f0", text: "Caja, papel, stickers y códigos de barras. Revisamos que el empaque coincida con el producto." },
  { key: "Olor", icon: "👃", color: "#ff6b9d", text: "Los pegamentos y materiales de fábrica tienen un olor característico. También lo notamos." },
  { key: "Desgaste", icon: "🔍", color: "#ff8a3d", text: "Estado real del par: suelas, talones, interior y marcas de uso, para describirlo con honestidad." },
];

/** Seis cosas que revisamos: se recorren solas y puedes tocar cualquiera. */
export default function WhatWeCheck() {
  const [active, setActive] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % ITEMS.length), 3400);
    return () => clearInterval(id);
  }, [manual]);

  const current = ITEMS[active];

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-stretch lg:gap-10">
      <div role="tablist" aria-label="Qué revisamos" className="flex flex-wrap gap-2 lg:w-60 lg:flex-col">
        {ITEMS.map((it, i) => {
          const on = i === active;
          return (
            <button
              key={it.key}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => {
                setManual(true);
                setActive(i);
              }}
              className={`relative flex items-center gap-2.5 overflow-hidden rounded-full border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-all duration-300 lg:rounded-xl lg:py-3 ${
                on ? "scale-[1.03] border-transparent text-ink shadow-md" : "border-line bg-paper-raised text-muted hover:border-ink hover:text-ink"
              }`}
              style={on ? { background: it.color } : undefined}
            >
              <span aria-hidden="true" className="text-base">{it.icon}</span>
              {it.key}
              {on && !manual && <span key={active} aria-hidden="true" className="wc-timer absolute inset-x-0 bottom-0 h-0.5 bg-ink/40" />}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        key={active}
        className="wc-panel relative flex min-h-[11rem] flex-col justify-center overflow-hidden rounded-2xl p-6 text-ink sm:p-8"
        style={{ background: `${current.color}26`, boxShadow: `inset 0 0 0 2px ${current.color}` }}
      >
        <span aria-hidden="true" className="absolute -right-4 -top-6 select-none text-[8rem] opacity-20">{current.icon}</span>
        <p className="font-display text-3xl tracking-wide sm:text-4xl">{current.key}</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed sm:text-base">{current.text}</p>
      </div>
    </div>
  );
}
