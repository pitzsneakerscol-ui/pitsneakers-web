"use client";

import { useEffect, useState } from "react";

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** Frase según cuánto falta: sube la tensión a medida que se acerca la hora. */
function mood(ms: number): string {
  const min = ms / 60_000;
  if (min <= 1) return "¡Ya casi! No cierres esta pantalla";
  if (min <= 10) return "Últimos minutos";
  if (min <= 60) return "Falta menos de una hora";
  if (min <= 180) return "Se viene fuerte";
  return "Cuenta regresiva";
}

/**
 * Contador del candado: cuenta hasta `target` con centésimas, anillo de progreso desde `start`
 * y más urgencia cuanto menos falta (late cada segundo, pulsa en la última hora y vibra en el último minuto).
 */
export default function PrelaunchCountdown({ target, start }: { target: string; start: string }) {
  // Null hasta montar en el cliente: la hora de cada quien evita un mismatch de hidratación.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const end = new Date(target).getTime();
  const begin = new Date(start).getTime();
  if (now === null) return <div className="h-[132px] sm:h-[148px]" aria-hidden="true" />;

  const left = Math.max(0, end - now);
  const done = left === 0;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left / 60_000) % 60);
  const s = Math.floor((left / 1000) % 60);
  const cs = Math.floor((left % 1000) / 10);
  const progress = Math.min(1, Math.max(0, (now - begin) / (end - begin)));
  const urgent = left <= 3_600_000 && !done;
  const frantic = left <= 60_000 && !done;

  if (done) {
    return (
      <div className="pl-timer pl-done mx-auto w-full max-w-lg rounded-3xl border border-accent/60 bg-accent/15 px-5 py-6 text-center">
        <p className="font-display text-4xl tracking-wide sm:text-5xl">¡Es la hora!</p>
        <p className="mt-1 text-sm text-white/75">Recarga la página: ya estamos abriendo.</p>
      </div>
    );
  }

  const cells: [string, string][] = [
    [pad(h), "horas"],
    [pad(m), "min"],
    [pad(s), "seg"],
  ];

  return (
    <div
      className={`pl-timer mx-auto w-full max-w-lg rounded-3xl border bg-black/30 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 ${urgent ? "pl-timer-urgent border-accent/70" : "border-white/15"} ${frantic ? "pl-timer-frantic" : ""}`}
      role="timer"
      aria-label={`Faltan ${h} horas, ${m} minutos y ${s} segundos`}
    >
      <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
        <span className="pl-dot" aria-hidden="true" /> {mood(left)}
      </p>
      <div className="mt-3 flex items-start justify-center gap-2 sm:gap-3" suppressHydrationWarning>
        {cells.map(([value, label], i) => (
          <div key={label} className="flex items-start gap-2 sm:gap-3">
            <div className="flex min-w-[4.2rem] flex-col items-center rounded-2xl bg-white/[0.07] px-2 py-3 ring-1 ring-white/10 sm:min-w-[5.4rem]">
              <span key={value} className="tick-pop font-display text-5xl tabular-nums leading-none sm:text-6xl">
                {value}
              </span>
              <span className="mt-2 text-[10px] uppercase tracking-widest text-white/55">{label}</span>
            </div>
            {i < cells.length - 1 && <span className="pl-colon pt-2 font-display text-4xl leading-none text-accent sm:text-5xl">:</span>}
          </div>
        ))}
        <span className="w-9 pt-5 text-left font-display text-2xl tabular-nums leading-none text-accent sm:w-11 sm:pt-6 sm:text-3xl">.{pad(cs)}</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="pl-bar h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mt-2 text-center text-xs text-white/60">Hoy a las 12:00 a. m. (hora de Colombia) se abre la nueva Pitsneakers</p>
    </div>
  );
}
