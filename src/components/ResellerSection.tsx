"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import OdometerValue from "@/components/OdometerValue";

const KPIS = [
  { label: "Invertido", value: "$1.740.000", tone: "" },
  { label: "Esperado", value: "$2.320.000", tone: "" },
  { label: "Utilidad", value: "+$580.000", tone: "text-emerald-400" },
];

const POINTS = ["Costo, talla y precio por par", "Ganancia real al instante", "Alertas de stock estancado"];

// Alturas ilustrativas: ventas por mes creciendo.
const BARS = [32, 46, 40, 58, 70, 90];

// Ventas de ejemplo que "entran" al panel una tras otra.
const SALES = [
  { pair: "Dunk Low Panda", profit: "+$140.000" },
  { pair: "Jordan 4 Military Black", profit: "+$250.000" },
  { pair: "Air Force 1 Triple White", profit: "+$190.000" },
];

export default function ResellerSection() {
  const root = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false); // la animación está lista (hay JS)
  const [play, setPlay] = useState(false); // la sección ya entró en pantalla
  const [sale, setSale] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    setArmed(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlay(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Una venta nueva cada pocos segundos, mientras la sección está en pantalla.
  useEffect(() => {
    if (!play || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setSale((s) => (s + 1) % SALES.length), 4200);
    return () => clearInterval(id);
  }, [play]);

  return (
    <div
      ref={root}
      className={`rs flex h-full flex-col justify-center rounded-lg border border-line bg-paper-raised px-6 py-12 sm:px-10 ${armed ? "rs-armed" : ""} ${play ? "rs-play" : ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Vende con nosotros</p>
      <h2 className="mt-4 font-display text-3xl leading-[1] tracking-wide text-balance sm:text-4xl">
        CONVIERTE TU STOCK EN UN <span className="rs-underline text-accent">NEGOCIO DE VERDAD.</span>
      </h2>
      <ul className="mt-4 space-y-1.5 text-sm text-muted sm:text-base">
        {POINTS.map((p, i) => (
          <li key={p} className="rs-reveal flex gap-2" style={{ "--i": i } as React.CSSProperties}>
            <span aria-hidden="true" className="text-accent">▸</span>
            {p}
          </li>
        ))}
      </ul>

      {/* Vista de ejemplo del panel (cifras ilustrativas) */}
      <div aria-hidden="true" className="relative mt-6 overflow-hidden rounded-lg bg-ink p-3 text-white">
        <div className="grid grid-cols-3 gap-2">
          {KPIS.map((k) => (
            <div key={k.label} className="rounded-md bg-white/5 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/50">{k.label}</p>
              <p className={`font-display text-base tracking-wide sm:text-lg ${k.tone}`}>
                {armed ? <OdometerValue value={k.value} play={play} /> : k.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-end gap-3">
          <div className="flex h-14 flex-1 items-end gap-1.5">
            {BARS.map((h, i) => (
              <span
                key={i}
                className={`rs-bar flex-1 rounded-t ${i === BARS.length - 1 ? "bg-accent" : "bg-white/20"}`}
                style={{ height: `${h}%`, "--i": i } as React.CSSProperties}
              />
            ))}
          </div>
          <span className="rs-chip mb-1 shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
            ↗ +25%
          </span>
        </div>

        {/* Aviso de venta que entra y sale */}
        <div className="mt-3 flex h-9 items-center overflow-hidden rounded-md bg-white/5 px-2.5 text-[11px]">
          {play ? (
            <p key={sale} className="rs-toast flex w-full items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-ink">✓</span>
              <span className="min-w-0 flex-1 truncate">{SALES[sale].pair} vendido</span>
              <span className="shrink-0 font-bold text-emerald-400">{SALES[sale].profit}</span>
            </p>
          ) : (
            <span className="text-white/40">Aquí verás tus ventas…</span>
          )}
        </div>
        <p className="mt-2 text-right text-[9px] uppercase tracking-wider text-white/40">Vista de ejemplo</p>
      </div>

      <div className="mt-7">
        <Link
          href="/revendedores"
          className="btn-pop btn-shine rs-cta relative inline-flex items-center justify-center rounded-full bg-accent px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:brightness-110"
        >
          Crear mi cuenta gratis
        </Link>
      </div>
    </div>
  );
}
