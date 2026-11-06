"use client";

import { useActionState, useState } from "react";
import { saveBlackFridayPrices } from "@/app/revendedores/bf-actions";
import { sellerBreakdown } from "@/lib/payout";
import { formatPrice } from "@/lib/format";
import { btnAccent, cardCls, submitWith } from "@/components/reseller/ui";
import type { BfPair } from "@/lib/bf-prices";

const digits = (s: string) => s.replace(/\D/g, "");

function Row({ pair, value, onChange }: { pair: BfPair; value: string; onChange: (v: string) => void }) {
  const price = Number(digits(value)) || 0;
  const pct = price > 0 && price < pair.price ? Math.round((1 - price / pair.price) * 100) : 0;
  const invalid = price > 0 && price >= pair.price;
  const receives = price > 0 ? sellerBreakdown(price, pair.kind).receives : 0;
  return (
    <li className={`${cardCls} flex flex-col gap-4 p-4 sm:flex-row sm:items-center`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {pair.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pair.image} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-paper object-contain" />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-lg bg-paper" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{pair.brand} {pair.name}</p>
          <p className="text-xs text-muted">
            {pair.sizes.length ? `Talla ${pair.sizes.join(", ")} · ` : ""}Precio normal {formatPrice(pair.price)}
          </p>
        </div>
      </div>
      <div className="sm:w-64">
        <label htmlFor={`bf-${pair.sku}`} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
          Precio Black Friday
        </label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
          <input
            id={`bf-${pair.sku}`}
            name={`bf_${pair.sku}`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Sin oferta"
            value={price ? price.toLocaleString("es-CO") : ""}
            onChange={(e) => onChange(digits(e.target.value))}
            aria-invalid={invalid}
            className={`w-full rounded-lg border bg-paper-raised py-2.5 pl-7 pr-16 text-sm tabular-nums outline-none transition focus:ring-2 focus:ring-ink/10 ${invalid ? "border-red-500" : "border-line focus:border-ink"}`}
          />
          {pct > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">−{pct}%</span>}
        </div>
        <p className={`mt-1 text-[11px] ${invalid ? "text-red-600" : "text-muted"}`}>
          {invalid ? "Tiene que ser menor al precio normal." : price > 0 ? `Recibirías ≈ ${formatPrice(receives)} (ya con comisión y envío)` : "Déjalo vacío si este par no entra."}
        </p>
      </div>
    </li>
  );
}

export default function BlackFridayForm({ pairs }: { pairs: BfPair[] }) {
  const [state, action, pending] = useActionState(saveBlackFridayPrices, undefined);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(pairs.map((p) => [p.sku, p.bfPrice ? String(p.bfPrice) : ""])));
  const joined = Object.values(values).filter((v) => Number(digits(v)) > 0).length;

  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <ul className="space-y-3">
        {pairs.map((p) => (
          <Row key={p.sku} pair={p} value={values[p.sku] ?? ""} onChange={(v) => setValues((s) => ({ ...s, [p.sku]: v }))} />
        ))}
      </ul>
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper-raised/95 p-3 shadow-lg backdrop-blur">
        <p className="text-sm" role="status" aria-live="polite">
          {state?.error ? <span className="text-red-600">{state.error}</span> : state?.message ? <span className="text-green-700">{state.message}</span> : <span className="text-muted">{joined} de {pairs.length} {pairs.length === 1 ? "par" : "pares"} con oferta</span>}
        </p>
        <button type="submit" disabled={pending} className={btnAccent}>
          {pending ? "Guardando…" : "Guardar precios"}
        </button>
      </div>
    </form>
  );
}
