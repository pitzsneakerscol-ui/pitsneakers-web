"use client";

import { useActionState } from "react";
import { notifyOffer } from "@/app/admin/actions";
import { btnAccent, inputCls, submitWith } from "@/components/reseller/ui";

/** "Avisar oferta": el dueño le cuenta al vendedor que llegó una oferta por uno de sus pares y de cuánto es. */
export default function OfferForm({ itemId }: { itemId: number }) {
  const [state, action, pending] = useActionState(notifyOffer, undefined);
  return (
    <details className="group min-w-[210px]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition hover:border-ink group-open:border-accent group-open:text-accent [&::-webkit-details-marker]:hidden">
        💰 Avisar oferta
      </summary>
      <form onSubmit={submitWith(action)} className="mt-2 space-y-2 rounded-xl border border-line bg-paper p-3">
        <input type="hidden" name="itemId" value={itemId} />
        <div className="flex items-center gap-1.5">
          <span className="text-muted">$</span>
          <input name="monto" inputMode="numeric" required autoComplete="off" placeholder="Monto ofertado" className={inputCls} />
        </div>
        <input name="hasta" maxLength={40} autoComplete="off" placeholder="Vigente hasta (opcional)" className={inputCls} />
        <input name="nota" maxLength={300} autoComplete="off" placeholder="Comentario (opcional)" className={inputCls} />
        <button type="submit" disabled={pending} className={`${btnAccent} w-full !px-4 !py-2.5`}>
          {pending ? "Enviando…" : "Enviar aviso"}
        </button>
        {state?.error && <p role="alert" className="text-xs text-accent">{state.error}</p>}
        {state?.ok && state.message && <p role="status" className="text-xs text-emerald-700">{state.message}</p>}
      </form>
    </details>
  );
}
