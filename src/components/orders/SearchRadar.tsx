"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

export interface RadarPair {
  name: string;
  size: string;
  image: string;
}

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

type Stage = "typing" | "searching" | "found";

/** Demostración del servicio: alguien escribe el par que busca, el radar lo rastrea y aparece. */
export default function SearchRadar({ pairs }: { pairs: RadarPair[] }) {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [stage, setStage] = useState<Stage>("typing");

  const pair = pairs[idx % Math.max(pairs.length, 1)];
  const query = pair ? `${pair.name} · talla ${pair.size}` : "";

  useEffect(() => {
    if (reduced || !pair) return;
    let id: ReturnType<typeof setTimeout>;
    if (stage === "typing") {
      id = setTimeout(
        () => {
          if (chars >= query.length) setStage("searching");
          else setChars((c) => c + 1);
        },
        chars >= query.length ? 500 : 55
      );
    } else if (stage === "searching") {
      id = setTimeout(() => setStage("found"), 2200);
    } else {
      id = setTimeout(() => {
        setIdx((i) => (i + 1) % pairs.length);
        setChars(0);
        setStage("typing");
      }, 3600);
    }
    return () => clearTimeout(id);
  }, [stage, chars, query.length, reduced, pair, pairs.length]);

  if (!pair) return null;
  const shownStage: Stage = reduced ? "found" : stage;
  const text = reduced ? query : query.slice(0, chars);

  return (
    <div className="mx-auto w-full max-w-sm" role="img" aria-label="Demostración: el radar busca el par que pediste y lo encuentra">
      {/* Barra de búsqueda */}
      <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 text-ink shadow-xl">
        <span aria-hidden="true" className="text-lg">🔎</span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {text}
          {shownStage === "typing" && <span className="or-caret ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-ink" />}
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            shownStage === "found" ? "bg-emerald-500 text-white" : shownStage === "searching" ? "bg-accent text-white" : "bg-ink/10 text-ink/50"
          }`}
        >
          {shownStage === "found" ? "¡Encontrado!" : shownStage === "searching" ? "Buscando…" : "Escribiendo"}
        </span>
      </div>

      {/* Radar */}
      <div className="relative mx-auto mt-6 aspect-square w-full max-w-[19rem]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`absolute inset-0 rounded-full border ${shownStage === "found" ? "border-emerald-400/40" : "border-white/20"} ${shownStage === "searching" ? "or-ring" : ""}`}
            style={{ transform: `scale(${0.4 + i * 0.3})`, animationDelay: `${i * 0.5}s` }}
          />
        ))}
        {shownStage === "searching" && <span aria-hidden="true" className="or-sweep absolute inset-0 rounded-full" />}

        {/* Puntos que el radar va "detectando" */}
        {shownStage === "searching" &&
          [
            { x: 22, y: 30 },
            { x: 72, y: 24 },
            { x: 80, y: 68 },
            { x: 30, y: 78 },
          ].map((d, i) => (
            <span key={i} aria-hidden="true" className="or-blip absolute h-2.5 w-2.5 rounded-full bg-accent" style={{ left: `${d.x}%`, top: `${d.y}%`, animationDelay: `${i * 0.45}s` }} />
          ))}

        <div className="absolute inset-0 flex items-center justify-center">
          {shownStage === "found" ? (
            <div key={pair.name} className="or-found relative h-36 w-36 overflow-hidden rounded-2xl bg-[#ebe8e2] shadow-2xl ring-4 ring-emerald-400/60 sm:h-40 sm:w-40">
              <Image src={pair.image} alt="" fill sizes="160px" className="object-contain p-3 mix-blend-multiply" />
              <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow">✓</span>
            </div>
          ) : (
            <span aria-hidden="true" className="or-bob text-5xl">{shownStage === "searching" ? "👟" : "🔎"}</span>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-white/40">Ejemplo de cómo trabajamos tu encargo</p>
    </div>
  );
}
