"use client";

import { useEffect, useRef } from "react";
import { formatPrice } from "@/lib/format";
import { burstConfetti } from "@/lib/confetti";
import AnimatedNumber from "@/components/reseller-landing/AnimatedNumber";
import PointerTilt from "@/components/PointerTilt";

export interface PreviewSize {
  size: string;
  qty: number;
}

const money = (n: number) => formatPrice(Math.abs(n));

/** Tarjeta del par que se arma en vivo mientras el vendedor llena el formulario. */
export default function PairPreview({
  name,
  brand,
  colorway,
  image,
  condition,
  sizes,
  cost,
  expected,
}: {
  name: string;
  brand: string;
  colorway: string;
  image: string;
  condition: "nuevo" | "usado";
  sizes: PreviewSize[];
  cost: number; // costo total por par (compra + extras)
  expected: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const celebrated = useRef(false);

  const pairs = sizes.reduce((s, x) => s + x.qty, 0);
  const hasPrice = expected > 0;
  const profit = hasPrice ? expected - cost : 0;
  const margin = hasPrice ? (profit / expected) * 100 : 0;
  const mood = !hasPrice ? "💭" : profit < 0 ? "😬" : margin >= 30 ? "🔥" : margin >= 15 ? "😎" : "🙂";

  // Confeti la primera vez que el margen llega a 30 %.
  useEffect(() => {
    if (margin >= 30 && !celebrated.current) {
      celebrated.current = true;
      burstConfetti(host.current, 22);
    } else if (margin < 20) {
      celebrated.current = false;
    }
  }, [margin]);

  const ring = 2 * Math.PI * 34;
  const pct = Math.min(Math.max(margin, 0), 60) / 60;

  return (
    <PointerTilt max={6}>
      <div ref={host} className="aw-float relative overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-xl">
        {/* Foto */}
        <div className="relative aspect-[5/4] bg-[#ebe8e2]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: "radial-gradient(circle at 50% 70%, rgb(200 64 40 / 0.18), transparent 60%)" }}
          />
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image} src={image} alt="" referrerPolicy="no-referrer" className="aw-photo absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink/25">
              <span className="aw-bob text-6xl">👟</span>
              <span className="text-[11px] font-semibold uppercase tracking-widest">Tu par aparecerá aquí</span>
            </div>
          )}
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              condition === "nuevo" ? "bg-ink text-white" : "bg-white/90 text-ink"
            }`}
          >
            {condition}
          </span>
          {pairs > 0 && (
            <span key={pairs} className="aw-pop absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {pairs} {pairs === 1 ? "par" : "pares"}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">{brand || "Marca"}</p>
          <h3 key={name} className="aw-pop truncate font-display text-2xl tracking-wide">
            {name || "Nombre del par"}
          </h3>
          {colorway && <p className="truncate text-xs text-muted">{colorway}</p>}

          <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
            {sizes.length === 0 ? (
              <span className="text-xs text-muted">Talla pendiente…</span>
            ) : (
              sizes.map((s) => (
                <span key={s.size} className="aw-pop rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-white">
                  {s.size}
                  {s.qty > 1 && <span className="ml-1 text-accent">×{s.qty}</span>}
                </span>
              ))
            )}
          </div>

          {/* Medidor de utilidad */}
          <div className="mt-4 flex items-center gap-4 rounded-xl bg-ink p-3 text-white">
            <div className="relative h-[76px] w-[76px] shrink-0">
              <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="7" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke={profit < 0 ? "#c84028" : "#3ddc84"}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={ring}
                  strokeDashoffset={ring * (1 - (hasPrice && profit > 0 ? pct : 0))}
                  className="aw-ring"
                />
              </svg>
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-2xl">{mood}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Utilidad por par</p>
              <p className={`font-display text-2xl tracking-wide sm:text-3xl ${profit < 0 ? "text-accent" : "text-emerald-400"}`}>
                {hasPrice ? (
                  <AnimatedNumber value={profit} format={(n) => `${n < 0 ? "−" : "+"}${money(n)}`} duration={500} />
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </p>
              <p className="text-[11px] text-white/60">
                {hasPrice ? `Margen ${margin.toFixed(0)}%` : "Pon tu precio esperado"}
                {hasPrice && pairs > 1 && (
                  <>
                    {" · "}
                    <strong className="text-white">{money(profit * pairs)}</strong> en total
                  </>
                )}
              </p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-paper px-2 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">Costo</dt>
              <dd className="font-display text-base tracking-wide">
                <AnimatedNumber value={cost} format={money} duration={500} />
              </dd>
            </div>
            <div className="rounded-lg bg-paper px-2 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">Esperado</dt>
              <dd className="font-display text-base tracking-wide">
                <AnimatedNumber value={expected} format={money} duration={500} />
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </PointerTilt>
  );
}
