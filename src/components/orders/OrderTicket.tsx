"use client";

import { useState } from "react";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/format";

const CONDITIONS = ["Nuevo", "Usado", "Cualquiera"] as const;

const inputCls =
  "w-full rounded-lg border border-line bg-paper-raised px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-ink/10";

/** Arma el encargo: mientras escribes, el "ticket" se va llenando y al final se envía por WhatsApp. */
export default function OrderTicket() {
  const [model, setModel] = useState("");
  const [size, setSize] = useState("");
  const [budget, setBudget] = useState(800000);
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>("Nuevo");

  const filled = [model.trim(), size.trim()].filter(Boolean).length;
  const ready = filled === 2;
  const pct = ((budget - 200000) / (6000000 - 200000)) * 100;

  const message =
    `Hola! Quiero hacer un encargo VIP. Estoy buscando: ${model.trim() || "(cuéntame el modelo)"}` +
    `${size.trim() ? `, talla ${size.trim()}` : ""}, presupuesto hasta ${formatPrice(budget)}, ${condition.toLowerCase() === "cualquiera" ? "nuevo o usado" : condition.toLowerCase()}.`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div className="space-y-5">
        <div>
          <label htmlFor="ot-model" className="text-[11px] font-semibold uppercase tracking-wider text-muted">Modelo y colorway</label>
          <input id="ot-model" value={model} onChange={(e) => setModel(e.target.value)} maxLength={80} placeholder="Ej: Jordan 1 Chicago" className={`${inputCls} mt-2`} />
        </div>
        <div className="grid grid-cols-[6rem_1fr] gap-3">
          <div>
            <label htmlFor="ot-size" className="text-[11px] font-semibold uppercase tracking-wider text-muted">Talla</label>
            <input id="ot-size" value={size} onChange={(e) => setSize(e.target.value)} maxLength={8} placeholder="9.5" className={`${inputCls} mt-2`} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Estado</p>
            <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Estado del par">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={condition === c}
                  onClick={() => setCondition(c)}
                  className={`flex-1 rounded-lg border px-2 py-3 text-xs font-semibold uppercase tracking-wide transition ${
                    condition === c ? "border-ink bg-ink text-white" : "border-line hover:border-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="ot-budget" className="text-[11px] font-semibold uppercase tracking-wider text-muted">Presupuesto máximo</label>
            <span className="font-display text-xl tabular-nums tracking-wide">{formatPrice(budget)}</span>
          </div>
          <input
            id="ot-budget"
            type="range"
            min={200000}
            max={6000000}
            step={50000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="rl-range mt-3 w-full"
            style={{ ["--pct" as string]: `${pct}%` }}
          />
        </div>
      </div>

      {/* Ticket */}
      <div className="mx-auto w-full max-w-sm">
        <div className="or-ticket relative rotate-1 rounded-2xl bg-white p-6 text-ink shadow-2xl">
          <div className="flex items-center justify-between border-b border-dashed border-ink/20 pb-4">
            <p className="font-display text-xl tracking-wide">
              ENCARGO <span className="text-accent">VIP</span>
            </p>
            <span
              className={`rounded-md border-2 px-2 py-0.5 font-display text-xs tracking-widest transition-all duration-500 ${
                ready ? "-rotate-6 scale-110 border-emerald-600 text-emerald-600" : "border-ink/20 text-ink/30"
              }`}
            >
              {ready ? "LISTO" : "EN BORRADOR"}
            </span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Busco", model.trim() || "—"],
              ["Talla", size.trim() || "—"],
              ["Estado", condition],
              ["Hasta", formatPrice(budget)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">{k}</dt>
                <dd key={v} className="or-pop min-w-0 truncate text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(filled / 2) * 100}%` }} />
          </div>
          <a
            href={buildGeneralWhatsAppLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn-pop btn-shine relative mt-5 inline-flex w-full items-center justify-center rounded-full bg-whatsapp px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-whatsapp-dark ${ready ? "wa-pulse" : ""}`}
          >
            Enviar mi encargo
          </a>
        </div>
      </div>
    </div>
  );
}
