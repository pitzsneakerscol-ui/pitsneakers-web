"use client";

import { startTransition, useActionState, useState } from "react";
import { respondOffer } from "@/app/revendedores/offer-actions";
import { btnAccent, inputCls } from "@/components/reseller/ui";

/** Botones del vendedor para responder una oferta: aceptar, contraofertar o rechazar. */
export default function OfferActions({ id }: { id: number }) {
  const [state, action, pending] = useActionState(respondOffer, undefined);
  const [mode, setMode] = useState<"" | "contraoferta" | "rechazada">("");

  const send = (decision: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.form;
    if (!form) return;
    e.preventDefault();
    if (decision === "aceptada" && !window.confirm("¿Aceptas esta oferta? El par quedará reservado.")) return;
    const fd = new FormData(form);
    fd.set("decision", decision);
    startTransition(() => action(fd));
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mt-4 space-y-3"
      aria-label="Responder oferta"
    >
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} onClick={send("aceptada")} className={btnAccent}>✅ Aceptar</button>
        <button type="button" disabled={pending} onClick={() => setMode(mode === "contraoferta" ? "" : "contraoferta")} className="inline-flex items-center rounded-full border border-line px-5 py-3 text-xs font-semibold uppercase tracking-wide transition hover:border-ink">
          🔁 Contraofertar
        </button>
        <button type="button" disabled={pending} onClick={() => setMode(mode === "rechazada" ? "" : "rechazada")} className="inline-flex items-center rounded-full border border-line px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent">
          ❌ Rechazar
        </button>
      </div>

      {mode === "contraoferta" && (
        <div className="space-y-2 rounded-xl border border-line bg-paper p-3">
          <div className="flex items-center gap-2">
            <span className="text-muted">$</span>
            <input name="counter" inputMode="numeric" autoComplete="off" placeholder="¿Cuánto pides?" className={inputCls} />
          </div>
          <input name="note" maxLength={300} autoComplete="off" placeholder="Comentario (opcional)" className={inputCls} />
          <button type="submit" disabled={pending} onClick={send("contraoferta")} className={btnAccent}>Enviar contraoferta</button>
        </div>
      )}
      {mode === "rechazada" && (
        <div className="space-y-2 rounded-xl border border-line bg-paper p-3">
          <input name="note" maxLength={300} autoComplete="off" placeholder="¿Por qué? (opcional)" className={inputCls} />
          <button type="submit" disabled={pending} onClick={send("rechazada")} className={btnAccent}>Confirmar rechazo</button>
        </div>
      )}

      {pending && <p className="text-xs text-muted">Enviando…</p>}
      {state?.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
      {state?.ok && state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}
    </form>
  );
}
