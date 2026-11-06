"use client";

import { useEffect, useState } from "react";
import type { Campaign } from "@/config/site";
import { LeadForm, useBfUnlocked } from "@/components/BlackFridayLead";

interface Fallback {
  kicker: string;
  title: string;
  subtitle: string;
  endsAt: string;
}

const TEASER_MS = 14 * 86400000;
const pad = (n: number) => String(n).padStart(2, "0");
const t = (iso: string) => new Date(iso).getTime();

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" }).format(new Date(iso)).replace(".", "");

type View =
  | { phase: "live"; c: Campaign }
  | { phase: "soon"; c: Campaign }
  | { phase: "plain" };

/** Qué toca mostrar a esta hora: campaña corriendo, campaña por arrancar (≤ 14 días) o el sale normal. */
function viewAt(now: number, campaigns: Campaign[]): View {
  const live = campaigns.find((c) => t(c.startsAt) <= now && now < t(c.endsAt));
  if (live) return { phase: "live", c: live };
  const next = campaigns
    .filter((c) => t(c.startsAt) > now && t(c.startsAt) - now <= TEASER_MS)
    .sort((a, b) => t(a.startsAt) - t(b.startsAt))[0];
  return next ? { phase: "soon", c: next } : { phase: "plain" };
}

function Clock({ to }: { to: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [to]);
  const left = now === null ? 0 : Math.max(0, to - now);
  const s = Math.floor(left / 1000);
  const units: [number, string][] = [
    [Math.floor(s / 86400), "días"],
    [Math.floor((s % 86400) / 3600), "hrs"],
    [Math.floor((s % 3600) / 60), "min"],
    [s % 60, "seg"],
  ];
  return (
    <div className="flex items-center gap-2" suppressHydrationWarning>
      {units.map(([v, l]) => (
        <div key={l} className="flex min-w-[3.4rem] flex-col items-center rounded-lg bg-white/10 px-2.5 py-2 ring-1 ring-white/10">
          <span className="font-display text-2xl tabular-nums leading-none text-white sm:text-3xl">{now === null ? "--" : pad(v)}</span>
          <span className="mt-1 text-[9px] uppercase tracking-widest text-white/60">{l}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Cabecera de /sale. Decide la fase en el navegador (con la hora de cada visitante) para que cambie justo a la hora de la campaña,
 * aunque la página se haya generado antes. El servidor manda la fase inicial para que no haya salto al cargar.
 */
export default function CampaignHero({
  campaigns,
  fallback,
  initialNow,
  communityUrl,
  stats,
}: {
  campaigns: Campaign[];
  fallback: Fallback | null;
  initialNow: number;
  communityUrl: string;
  /** Cuántos pares están en oferta y el mayor descuento (solo se muestran si hay). */
  stats?: { pairs: number; maxPct: number };
}) {
  const unlocked = useBfUnlocked();
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    // Un tick por segundo basta para cambiar de fase a tiempo; el reloj de cada caja se mueve solo.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const v = viewAt(now, campaigns);
  const live = v.phase === "live";
  const soon = v.phase === "soon";
  const title = v.phase === "plain" ? (fallback?.title ?? "Sale") : v.c.title;
  const kicker = v.phase === "plain" ? (fallback?.kicker ?? "Rebajas") : v.c.kicker;
  const subtitle = v.phase === "plain" ? (fallback?.subtitle ?? "") : v.c.subtitle;
  const target = live ? t(v.c.endsAt) : soon ? t(v.c.startsAt) : fallback?.endsAt ? t(fallback.endsAt) : 0;
  const targetLabel = soon ? "Empieza en" : "Termina en";
  const showSteps = campaigns.length > 1 && (live || soon);

  return (
    <section
      aria-label={title}
      className="relative overflow-hidden rounded-3xl bg-[#0d0d0e] px-6 py-9 text-white sm:px-10 sm:py-12"
      style={{ backgroundImage: "radial-gradient(60% 120% at 100% 0%, rgba(200,64,40,0.35) 0%, transparent 60%), radial-gradient(40% 80% at 0% 100%, rgba(255,210,63,0.12) 0%, transparent 70%)" }}
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#ff8a6b]">
            {live && <span aria-hidden="true" className="nav-dot" style={{ ["--glow" as string]: "#ff5a3c" }} />}
            {soon ? `${kicker} · muy pronto` : kicker}
          </p>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-wide sm:text-7xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-xl text-sm text-white/70 sm:text-base">{subtitle}</p>}
          {soon && (
            <div className="mt-6">
              {unlocked ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm ring-1 ring-white/20">
                  <span aria-hidden="true">✅</span> Ya estás adentro: te avisamos por correo apenas arranque.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm font-semibold">Deja tu correo y entra primero:</p>
                  <LeadForm id="bf-hero" compact cta="Quiero entrar primero" />
                </>
              )}
              <a href={communityUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-white/60 underline underline-offset-4 hover:text-white">
                O únete a la comunidad por WhatsApp
              </a>
            </div>
          )}
          {live && stats && stats.pairs > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider">
              {stats.maxPct > 0 && <li className="rounded-full bg-[#ff5a3c] px-4 py-2 text-white">Hasta −{stats.maxPct}%</li>}
              <li className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">{stats.pairs} {stats.pairs === 1 ? "par" : "pares"} en oferta</li>
              <li className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">Verificados</li>
            </ul>
          )}
        </div>

        {target > 0 && (
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-white/60 lg:text-right">{targetLabel}</p>
            <Clock to={target} />
          </div>
        )}
      </div>

      {showSteps && (
        <ol className="mt-10 grid grid-cols-3 gap-2 border-t border-white/10 pt-6 text-[11px] sm:gap-4 sm:text-xs" aria-label="Calendario de la campaña">
          {campaigns.map((c) => {
            const done = now >= t(c.endsAt);
            const cur = t(c.startsAt) <= now && now < t(c.endsAt);
            return (
              <li
                key={c.id}
                aria-current={cur ? "step" : undefined}
                className={`rounded-xl px-3 py-2.5 ring-1 ${cur ? "bg-white/10 ring-white/40" : "ring-white/10"} ${done ? "opacity-40" : ""}`}
              >
                <span className="block text-[10px] uppercase tracking-widest text-white/60">
                  {dayLabel(c.startsAt)}
                  {done ? " · terminó" : cur ? " · ahora" : ""}
                </span>
                <span className="mt-0.5 block font-semibold leading-tight">{c.name}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
