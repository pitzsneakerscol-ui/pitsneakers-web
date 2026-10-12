"use client";

import { useActionState } from "react";
import { answerQuestion } from "@/app/admin/actions";
import { btnPrimary, inputCls, submitWith } from "@/components/reseller/ui";

/** Respuesta del equipo a una consulta de mercado: recomendación + comentario. */
export default function AnswerForm({ id, verdict, answer }: { id: number; verdict?: string; answer?: string }) {
  const [state, action, pending] = useActionState(answerQuestion, undefined);
  return (
    <form onSubmit={submitWith(action)} className="mt-3 space-y-3">
      <input type="hidden" name="id" value={id} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Recomendación</legend>
        {(
          [
            ["comprar", "✅ Comprar"],
            ["esperar", "⏳ Esperar"],
            ["no", "❌ No"],
          ] as const
        ).map(([v, label]) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name="verdict" value={v} defaultChecked={verdict === v} required className="peer sr-only" />
            <span className="inline-flex rounded-full border border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30">
              {label}
            </span>
          </label>
        ))}
      </fieldset>
      <textarea name="answer" rows={3} maxLength={1500} defaultValue={answer} placeholder="Tu comentario: cómo se mueve en el mercado, a qué precio conviene, qué talla sale más…" className={inputCls} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Enviando…" : answer ? "Actualizar respuesta" : "Responder"}</button>
        {state?.ok && state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}
        {state?.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
      </div>
    </form>
  );
}
