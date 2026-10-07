"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { useInView } from "@/lib/useInView";
import AnimatedNumber from "@/components/reseller-landing/AnimatedNumber";

interface Pair {
  name: string;
  size: string;
  cost: number;
  ask: number;
}

// Pares de ejemplo que entran y salen del panel. (Cifras ilustrativas.)
const PAIRS: Pair[] = [
  { name: "Dunk Low Panda", size: "9", cost: 380000, ask: 520000 },
  { name: "Jordan 4 Military Black", size: "10", cost: 850000, ask: 1100000 },
  { name: "Air Force 1 Triple White", size: "8.5", cost: 510000, ask: 700000 },
  { name: "Yeezy 700 Wave Runner", size: "9.5", cost: 620000, ask: 850000 },
  { name: "Samba OG Black", size: "10.5", cost: 280000, ask: 390000 },
  { name: "New Balance 550 White Green", size: "9", cost: 450000, ask: 620000 },
];

interface Row extends Pair {
  id: number;
}

const BASE_INVESTED = 820000;
const BASE_EXPECTED = 1120000;
const START_PROFIT = 580000;
const money = (n: number) => formatPrice(n);

export default function PanelDemo() {
  const [ref, play] = useInView<HTMLDivElement>(0.3);
  const [rows, setRows] = useState<Row[]>(() => PAIRS.slice(0, 3).map((p, i) => ({ ...p, id: i })));
  const [soldId, setSoldId] = useState<number | null>(null);
  const [profit, setProfit] = useState(START_PROFIT);
  const [sales, setSales] = useState(12);
  const [spark, setSpark] = useState<number[]>([120, 180, 160, 260, 340, 430, START_PROFIT / 1000]);
  const [toast, setToast] = useState<{ id: number; text: string; gain: number } | null>(null);
  const nextPair = useRef(3);
  const nextId = useRef(3);
  const rowsRef = useRef<Row[]>(rows);
  const seq = useRef(0);

  // Una venta nueva cada pocos segundos mientras el panel está a la vista.
  useEffect(() => {
    if (!play || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const id = setInterval(() => {
      const sold = rowsRef.current[0];
      if (!sold) return;
      const gain = sold.ask - sold.cost;
      seq.current += 1;
      setSoldId(sold.id);
      setProfit((p) => p + gain);
      setSales((n) => n + 1);
      setSpark((arr) => [...arr.slice(-9), (arr[arr.length - 1] ?? 0) + gain / 1000]);
      setToast({ id: seq.current, text: `${sold.name} vendido`, gain });
      // El par vendido sale y entra uno nuevo al final de la lista.
      timers.push(
        setTimeout(() => {
          const fresh: Row = { ...PAIRS[nextPair.current % PAIRS.length], id: nextId.current++ };
          nextPair.current += 1;
          const next = [...rowsRef.current.filter((x) => x.id !== sold.id), fresh];
          rowsRef.current = next;
          setRows(next);
          setSoldId(null);
        }, 900)
      );
    }, 3600);
    return () => {
      clearInterval(id);
      timers.forEach(clearTimeout);
    };
  }, [play]);

  const invested = BASE_INVESTED + rows.reduce((s, r) => s + r.cost, 0);
  const expected = BASE_EXPECTED + rows.reduce((s, r) => s + r.ask, 0);

  // Línea de ganancia acumulada
  const W = 300;
  const H = 70;
  const max = Math.max(...spark);
  const min = Math.min(...spark);
  const pts = spark.map((v, i) => [(i / (spark.length - 1)) * W, H - 8 - ((v - min) / Math.max(max - min, 1)) * (H - 20)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  const bars = [32, 46, 40, 58, 70, Math.min(100, 78 + (sales - 12) * 3)];

  return (
    <div ref={ref} className={`rl-demo ${play ? "rl-play" : ""} relative overflow-hidden rounded-2xl bg-ink p-4 text-white shadow-2xl sm:p-6`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl" aria-hidden="true" />

      <div className="relative flex items-center justify-between">
        <p className="font-display text-xl tracking-wide sm:text-2xl">
          MI <span className="text-accent">PANEL</span>
        </p>
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80">
          <span className="nav-dot" style={{ ["--glow" as string]: "#3ddc84" }} />
          En vivo · ejemplo
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Invertido", value: invested, tone: "" },
          { label: "Esperado", value: expected, tone: "" },
          { label: "Utilidad real", value: profit, tone: "text-emerald-400", glow: true },
        ].map((k) => (
          <div key={k.label} className="rounded-lg bg-white/5 px-2.5 py-2.5 sm:px-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/50 sm:text-[10px]">{k.label}</p>
            <p className={`mt-0.5 font-display text-sm tracking-wide sm:text-xl ${k.tone}`}>
              <AnimatedNumber value={k.value} format={(n) => (k.glow ? `+${money(n)}` : money(n))} />
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-4 grid gap-4 sm:grid-cols-[1.2fr_1fr]">
        {/* Gráfica de ganancia + barras */}
        <div className="rounded-lg bg-white/5 p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Ganancia acumulada</p>
            <p className="text-[11px] font-bold text-emerald-400">↗ {sales} ventas</p>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-20 w-full" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="rl-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3ddc84" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3ddc84" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#rl-area)" />
            <path d={line} fill="none" stroke="#3ddc84" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="rl-draw" />
            {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill="#3ddc84" className="rl-pulse-dot" />}
          </svg>
          <div className="mt-3 flex h-12 items-end gap-1.5">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`rl-bar flex-1 rounded-t ${i === bars.length - 1 ? "bg-accent" : "bg-white/20"}`}
                style={{ height: `${h}%`, ["--i" as string]: i }}
              />
            ))}
          </div>
        </div>

        {/* Inventario en vivo */}
        <div className="rounded-lg bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Inventario</p>
            <span className="rl-warn rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">⚠ 2 estancados</span>
          </div>
          <ul className="mt-2 divide-y divide-white/10 text-sm">
            {rows.map((r) => {
              const gain = r.ask - r.cost;
              const sold = soldId === r.id;
              return (
                <li key={r.id} className={`rl-row flex items-center justify-between gap-2 py-2 ${sold ? "rl-row-sold" : ""}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{r.name}</span>
                    <span className="block text-[11px] text-white/50">
                      Talla {r.size} · costo {money(r.cost)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-semibold tabular-nums">{money(r.ask)}</span>
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${sold ? "text-accent" : "text-emerald-400"}`}>
                      {sold ? "¡Vendido!" : `+${money(gain)}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Aviso de venta */}
      <div className="relative mt-4 flex h-10 items-center overflow-hidden rounded-lg bg-white/5 px-3 text-xs">
        {toast ? (
          <p key={toast.id} className="rs-toast flex w-full items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[11px] font-bold text-ink">✓</span>
            <span className="min-w-0 flex-1 truncate">{toast.text}</span>
            <span className="shrink-0 font-bold text-emerald-400">+{money(toast.gain)}</span>
          </p>
        ) : (
          <span className="text-white/40">Aquí verás entrar cada venta…</span>
        )}
      </div>
    </div>
  );
}
