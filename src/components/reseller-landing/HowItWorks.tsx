"use client";

import { useInView } from "@/lib/useInView";

const STEPS = [
  { n: "1", title: "Crea tu cuenta", text: "Usuario y contraseña, en menos de un minuto. Sin costo.", glow: "#ff5a3c" },
  { n: "2", title: "Sube tu inventario", text: "Par por par, con varias tallas a la vez, o importa tu Excel (CSV).", glow: "#ffd23f" },
  { n: "3", title: "Vende y mira tu ganancia", text: "Marca cada venta y el panel calcula tu utilidad real, por par y por mes.", glow: "#3ddc84" },
];

export default function HowItWorks() {
  const [ref, play] = useInView<HTMLOListElement>(0.35);
  return (
    <ol ref={ref} className={`rl-steps ${play ? "rl-play" : ""} grid gap-6 md:grid-cols-3`}>
      {STEPS.map((s, i) => (
        <li key={s.n} className="rl-step relative rounded-xl border border-line bg-paper-raised p-6" style={{ ["--i" as string]: i, ["--c" as string]: s.glow }}>
          <span
            className="rl-num flex h-12 w-12 items-center justify-center rounded-full font-display text-2xl text-ink"
            style={{ background: s.glow, boxShadow: `0 0 0 6px ${s.glow}33` }}
          >
            {s.n}
          </span>
          <h3 className="mt-4 font-display text-2xl tracking-wide">{s.title}</h3>
          <p className="mt-2 text-sm text-muted">{s.text}</p>
          {i < STEPS.length - 1 && <span aria-hidden="true" className="rl-link absolute left-[calc(100%-1px)] top-12 hidden h-0.5 w-6 bg-line md:block" />}
        </li>
      ))}
    </ol>
  );
}
