"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import AnimatedNumber from "@/components/reseller-landing/AnimatedNumber";

const money = (n: number) => formatPrice(n);

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </label>
        <span className="font-display text-xl tracking-wide tabular-nums">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rl-range mt-2 w-full"
        style={{ ["--pct" as string]: `${pct}%` }}
      />
    </div>
  );
}

/** Calculadora interactiva: mueve los controles y la ganancia se recalcula en vivo. */
export default function ProfitCalculator() {
  const [cost, setCost] = useState(500000);
  const [price, setPrice] = useState(700000);
  const [extra, setExtra] = useState(20000);
  const [pairs, setPairs] = useState(8);

  const perPair = price - cost - extra;
  const margin = price > 0 ? (perPair / price) * 100 : 0;
  const monthly = perPair * pairs;
  const yearly = monthly * 12;
  const invested = cost * pairs;
  const good = perPair >= 0;

  return (
    <div className="grid gap-6 overflow-hidden rounded-2xl border border-line bg-paper-raised lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6 p-6 sm:p-8">
        <Slider id="calc-cost" label="Pagas por par" value={cost} min={100000} max={3000000} step={10000} onChange={setCost} display={money(cost)} />
        <Slider id="calc-price" label="Lo vendes en" value={price} min={100000} max={4000000} step={10000} onChange={setPrice} display={money(price)} />
        <Slider id="calc-extra" label="Gastos por par (envío, comisión)" value={extra} min={0} max={200000} step={5000} onChange={setExtra} display={money(extra)} />
        <Slider id="calc-pairs" label="Pares que vendes al mes" value={pairs} min={1} max={40} step={1} onChange={setPairs} display={String(pairs)} />
      </div>

      <div className="relative overflow-hidden bg-ink p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl" style={{ background: good ? "#3ddc8433" : "#c8402a55" }} aria-hidden="true" />
        <p className="relative text-[11px] font-semibold uppercase tracking-wider text-white/50">Ganancia por par</p>
        <p className={`relative mt-1 font-display text-5xl tracking-wide sm:text-6xl ${good ? "text-emerald-400" : "text-accent"}`}>
          <AnimatedNumber value={perPair} format={(n) => `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`} duration={500} />
        </p>
        <p className="relative mt-1 text-sm text-white/60">
          Margen <strong className={good ? "text-emerald-400" : "text-accent"}>{margin.toFixed(0)}%</strong> sobre el precio de venta
        </p>

        <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div
            className={`rl-meter h-full rounded-full ${good ? "bg-emerald-400" : "bg-accent"}`}
            style={{ width: `${Math.min(Math.max(margin, 2), 100)}%` }}
          />
        </div>

        <dl className="relative mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Al mes", value: monthly },
            { label: "Al año", value: yearly },
            { label: "Invertido", value: invested },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-white/5 px-2 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{s.label}</dt>
              <dd className="mt-1 font-display text-base tracking-wide sm:text-lg">
                <AnimatedNumber value={s.value} format={(n) => `${n < 0 ? "−" : ""}${money(Math.abs(n))}`} duration={500} />
              </dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={() => document.getElementById("registro")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="btn-pop btn-shine relative mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:brightness-110"
        >
          Llevar este control en mi panel
        </button>
        <p className="relative mt-3 text-center text-[10px] uppercase tracking-wider text-white/40">Simulación con tus propias cifras</p>
      </div>
    </div>
  );
}
