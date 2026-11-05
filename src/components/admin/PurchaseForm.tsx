"use client";

import { useActionState } from "react";
import { confirmPurchase } from "@/app/admin/actions";
import { btnAccent, inputCls, submitWith } from "@/components/reseller/ui";
import { sellerRules, verificationPointLines } from "@/lib/seller-confirm-shared";

/**
 * "Confirmar compra": el dueño le confirma al vendedor que le compra el par al precio pactado. Le llega dónde dejarlo
 * (punto de verificación en Bogotá) y las tres reglas; el par queda reservado.
 */
export default function PurchaseForm({ itemId }: { itemId: number }) {
  const [state, action, pending] = useActionState(confirmPurchase, undefined);
  return (
    <details className="group min-w-[210px]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition hover:border-ink group-open:border-emerald-600 group-open:text-emerald-700 [&::-webkit-details-marker]:hidden">
        ✅ Confirmar compra
      </summary>
      <form onSubmit={submitWith(action)} className="mt-2 w-[260px] space-y-2 rounded-xl border border-line bg-paper p-3">
        <input type="hidden" name="itemId" value={itemId} />
        <div className="flex items-center gap-1.5">
          <span className="text-muted">$</span>
          <input name="monto" inputMode="numeric" required autoComplete="off" placeholder="Precio de compra" className={inputCls} />
        </div>
        <input name="nota" maxLength={300} autoComplete="off" placeholder="Comentario (opcional)" className={inputCls} />

        <div className="rounded-lg border border-line p-2.5 text-[11px] leading-snug text-muted">
          <p className="font-semibold uppercase tracking-wider text-ink">Esto le llega al vendedor</p>
          <address className="mt-1 not-italic">
            {verificationPointLines().map((l, i) => (
              <span key={l} className={i === 1 ? "block font-semibold text-ink" : "block"}>{l}</span>
            ))}
          </address>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {sellerRules().map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="email" defaultChecked className="h-4 w-4 accent-emerald-700" />
          También por correo
        </label>
        <button type="submit" disabled={pending} className={`${btnAccent} w-full !px-4 !py-2.5`}>
          {pending ? "Confirmando…" : "Confirmar compra"}
        </button>
        {state?.error && <p role="alert" className="text-xs text-accent">{state.error}</p>}
        {state?.ok && state.message && <p role="status" className="text-xs text-emerald-700">{state.message}</p>}
      </form>
    </details>
  );
}
