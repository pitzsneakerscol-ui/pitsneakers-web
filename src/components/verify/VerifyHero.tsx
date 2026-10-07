"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import OdometerValue from "@/components/OdometerValue";
import { useInView } from "@/lib/useInView";

const CHECKS = ["Costuras", "Etiquetas", "Materiales", "Empaque"];
// Posición de los puntos de revisión sobre la foto (% del recuadro).
const SPOTS = [
  { x: 28, y: 58 },
  { x: 62, y: 30 },
  { x: 48, y: 70 },
  { x: 78, y: 62 },
];

const REDUCE = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCE).matches,
    () => false
  );
}

export default function VerifyHero({
  photo,
  photoName,
  members,
  city,
}: {
  photo: string | null;
  photoName: string;
  members: string;
  city: string;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(0); // 0-3: revisando cada punto · 4: sello · 5: pausa
  const [statsRef, statsSeen] = useInView<HTMLDivElement>(0.4);

  useEffect(() => {
    if (reduced) return;
    const delay = phase < CHECKS.length ? 1300 : phase === CHECKS.length ? 400 : 3600;
    const id = setTimeout(() => setPhase((p) => (p >= CHECKS.length + 1 ? 0 : p + 1)), delay);
    return () => clearTimeout(id);
  }, [phase, reduced]);

  const shown = reduced ? CHECKS.length + 1 : phase;
  const scanning = shown < CHECKS.length;
  const stamped = shown >= CHECKS.length;

  return (
    <section className="relative overflow-hidden bg-ink py-14 text-white sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8">
        <div>
          <p className="fade-up text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Sobre nosotros</p>
          <h1 className="mt-4 font-display text-4xl leading-[0.98] tracking-wide text-balance sm:text-6xl">
            <span className="hero-word" style={{ ["--i" as string]: 0 }}>LA</span>{" "}
            <span className="hero-word" style={{ ["--i" as string]: 1 }}>GARANTÍA</span>{" "}
            <span className="hero-word" style={{ ["--i" as string]: 2 }}>DETRÁS</span>{" "}
            <span className="hero-word" style={{ ["--i" as string]: 3 }}>DE</span>{" "}
            <span className="hero-word hero-underline text-accent" style={{ ["--i" as string]: 4 }}>CADA PAR</span>
          </h1>
          <p className="fade-up mt-5 max-w-xl text-sm text-white/70 sm:text-base" style={{ ["--delay" as string]: "600ms" }}>
            Pitsneakers nació como una comunidad de reventa por WhatsApp e Instagram en {city}. Hoy seguimos operando
            igual — pero con un proceso de verificación que protege a compradores y vendedores en cada transacción.
          </p>
          <div ref={statsRef} className="mt-7 flex gap-8">
            <div>
              <p className="font-display text-4xl tracking-wide text-accent sm:text-5xl">
                <OdometerValue value="100%" play={statsSeen} />
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Revisado a mano</p>
            </div>
            <div>
              <p className="font-display text-4xl tracking-wide text-accent sm:text-5xl">
                <OdometerValue value={members} play={statsSeen} />
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Miembros</p>
            </div>
          </div>
        </div>

        {/* Escáner de verificación */}
        <div className="mx-auto w-full max-w-md" aria-label="Demostración del proceso de verificación" role="img">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#ebe8e2]">
              {photo ? (
                <Image src={photo} alt="" fill sizes="420px" className="object-contain p-6 mix-blend-multiply" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center font-display text-6xl text-ink/10">PIT</div>
              )}

              {/* Esquinas de visor */}
              {["left-2 top-2 border-l-2 border-t-2", "right-2 top-2 border-r-2 border-t-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"].map((c) => (
                <span key={c} aria-hidden="true" className={`absolute h-5 w-5 border-ink/70 ${c}`} />
              ))}

              {/* Rayo de escaneo */}
              {scanning && <span aria-hidden="true" className="vf-beam pointer-events-none absolute inset-x-0 top-0 h-1/3" />}

              {/* Puntos de revisión */}
              {SPOTS.map((s, i) => {
                const done = shown > i;
                const active = shown === i;
                return (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                      done ? "scale-110 bg-emerald-500 text-white" : active ? "vf-ping bg-accent text-white" : "scale-75 bg-ink/20 text-transparent"
                    }`}
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  >
                    {done ? "✓" : ""}
                  </span>
                );
              })}

              {/* Sello */}
              {stamped && (
                <span
                  aria-hidden="true"
                  className="vf-stamp pointer-events-none absolute left-1/2 top-1/2 rounded-lg border-4 border-emerald-600 px-4 py-1.5 font-display text-2xl tracking-widest text-emerald-600 sm:text-3xl"
                >
                  VERIFICADO
                </span>
              )}
            </div>

            <p className="mt-3 truncate text-center text-xs text-white/60">{photoName}</p>

            <ul className="mt-3 grid grid-cols-2 gap-2">
              {CHECKS.map((c, i) => {
                const done = shown > i;
                const active = shown === i;
                return (
                  <li
                    key={c}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${
                      done ? "bg-emerald-500/15 text-emerald-300" : active ? "bg-accent/20 text-white" : "bg-white/5 text-white/40"
                    }`}
                  >
                    <span className="flex h-4 w-4 items-center justify-center">
                      {done ? "✓" : active ? <span className="vf-spin h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white" /> : "·"}
                    </span>
                    {c}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
