"use client";

import { useEffect, useId, useState } from "react";
import { LEAGUES, MANUAL_WEIGHT, RARITIES, fmtPoints, type League, type LeagueStatus } from "@/lib/leagues";

/** Emblema de liga: una gema con los colores de la liga. */
export function Gem({ league, size = 64, dim = false }: { league: League; size?: number; dim?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ opacity: dim ? 0.35 : 1, filter: dim ? "grayscale(0.6)" : `drop-shadow(0 4px 14px ${league.to}88)` }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={league.from} />
          <stop offset="1" stopColor={league.to} />
        </linearGradient>
      </defs>
      <path d="M32 4 56 22 32 60 8 22Z" fill={`url(#g${id})`} />
      <path d="M8 22h48L32 4Z" fill="#fff" fillOpacity=".28" />
      <path d="M8 22 32 60 20 22Z" fill="#000" fillOpacity=".10" />
      <path d="M56 22 32 60 44 22Z" fill="#000" fillOpacity=".22" />
      <path d="M20 22 32 4 44 22 32 60Z" fill="#fff" fillOpacity=".12" />
    </svg>
  );
}

/** Tarjeta de liga de la colección: emblema, puntos, avance a la siguiente liga y recorrido de todas las ligas. */
export default function LeagueCard({ status, pairs }: { status: LeagueStatus; pairs: number }) {
  const { current, next, points, toNext, pct } = status;
  // La barra arranca vacía y se llena al abrir la página.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

  const cheapest = RARITIES.slice().reverse().find((r) => r.points >= toNext) ?? RARITIES[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-paper-raised" style={{ boxShadow: `0 0 0 1px ${current.to}33, 0 12px 40px -18px ${current.to}77` }}>
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-7" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${current.to}26, transparent 60%)` }}>
        <div className="flex items-center gap-5">
          <Gem league={current} size={96} />
          <div className="sm:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">Tu liga</p>
            <p className="font-display text-5xl leading-none tracking-wide" style={{ color: current.to }}>{current.label}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.25em] text-muted sm:block">Tu liga</p>
          <p className="hidden font-display text-6xl leading-none tracking-wide sm:block" style={{ color: current.to }}>{current.label}</p>
          <p className="mt-1 text-sm text-muted">
            <strong className="text-ink">{fmtPoints(points)} puntos</strong> · {pairs} {pairs === 1 ? "par" : "pares"}
          </p>

          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance a la siguiente liga">
              <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${shown}%`, background: `linear-gradient(90deg, ${current.from}, ${current.to})` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {next ? (
                <>
                  Te faltan <strong className="text-ink">{fmtPoints(toNext)} puntos</strong> para <strong style={{ color: next.to }}>{next.label}</strong>. Un par {cheapest.label} suma {cheapest.points}.
                </>
              ) : (
                <>¡Llegaste a la liga máxima! Eres de lo más alto del coleccionismo.</>
              )}
            </p>
          </div>
        </div>
      </div>

      <ol className="grid grid-cols-5 border-t border-line text-center">
        {LEAGUES.map((l) => {
          const reached = points >= l.min;
          const here = l.key === current.key;
          return (
            <li key={l.key} className={`flex flex-col items-center gap-1 px-1 py-3 ${here ? "bg-ink/[0.06]" : ""}`} aria-current={here ? "step" : undefined}>
              <Gem league={l} size={30} dim={!reached} />
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${here ? "text-ink" : "text-muted"}`}>{l.label}</span>
              <span className="text-[10px] text-muted">{l.min} pts</span>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-muted">
        Cada par suma según su rareza (por valor aproximado):{" "}
        {RARITIES.slice().reverse().map((r, i) => (
          <span key={r.key}>
            {i > 0 && " · "}
            <strong className="text-ink">{r.label}</strong> {r.points}
          </span>
        ))}
        . Los pares agregados a mano suman la mitad ({MANUAL_WEIGHT * 100}%) porque no los hemos verificado; los comprados en Pitsneakers suman completo.
      </p>
    </section>
  );
}
