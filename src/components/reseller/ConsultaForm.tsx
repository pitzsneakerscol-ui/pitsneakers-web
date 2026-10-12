"use client";

import { useActionState, useState } from "react";
import { askMarket } from "@/app/revendedores/market-actions";
import { btnAccent, cardCls, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

const SIZES = ["6", "7", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12"];

/** Formulario "Pregúntale al equipo": ¿me recomiendan comprar este par? */
export default function ConsultaForm({ suggestions }: { suggestions: string[] }) {
  const [state, action, pending] = useActionState(askMarket, undefined);
  const [formKey, setFormKey] = useState(0);
  const done = Boolean(state?.ok);

  if (done) {
    return (
      <div className={`${cardCls} p-6 text-center`}>
        <p className="text-4xl" aria-hidden="true">📨</p>
        <h2 className="mt-2 font-display text-3xl tracking-wide">¡Consulta enviada!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{state?.message}</p>
        <button type="button" onClick={() => setFormKey((k) => k + 1)} className={`${btnAccent} mt-5`}>
          Hacer otra consulta
        </button>
      </div>
    );
  }

  return (
    <form key={formKey} onSubmit={submitWith(action)} className={`${cardCls} space-y-5 p-5 sm:p-6`}>
      <div>
        <label htmlFor="c-model" className={labelCls}>¿Qué par te interesa? *</label>
        <input id="c-model" name="model" required list="c-sugerencias" autoComplete="off" placeholder="Ej: Jordan 4 Military Black, Dunk Low Panda…" className={inputCls} />
        <datalist id="c-sugerencias">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-size" className={labelCls}>Talla (opcional)</label>
          <input id="c-size" name="size" list="c-tallas" autoComplete="off" placeholder="9, 9.5, 10…" className={inputCls} />
          <datalist id="c-tallas">
            {SIZES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="c-price" className={labelCls}>¿A cuánto lo comprarías? (opcional)</label>
          <div className="flex items-center gap-2">
            <span className="text-muted">$</span>
            <input id="c-price" name="buyPrice" inputMode="numeric" autoComplete="off" placeholder="850.000" className={inputCls} />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="c-note" className={labelCls}>¿Qué quieres saber? (opcional)</label>
        <textarea id="c-note" name="note" rows={3} maxLength={600} placeholder="¿Se está moviendo rápido? ¿Está caro a ese precio? ¿Lo vendo o lo guardo?" className={inputCls} />
      </div>

      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnAccent}>
          {pending ? "Enviando…" : "Enviar al equipo"}
        </button>
        <p className="text-xs text-muted">Le llega al equipo de Pitsneakers y te respondemos aquí en el panel.</p>
      </div>
    </form>
  );
}
