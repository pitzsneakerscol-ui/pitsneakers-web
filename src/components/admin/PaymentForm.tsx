"use client";

import { useActionState } from "react";
import { savePayment } from "@/app/admin/actions";
import type { Payment } from "@/lib/admin";
import { btnAccent, inputCls, labelCls, selectAutoCls, submitWith } from "@/components/reseller/ui";

export interface PartyOption {
  value: string; // "c:12" o "r:5"
  label: string;
}

export default function PaymentForm({
  parties,
  payment,
  defaultParty = "",
}: {
  parties: PartyOption[];
  payment?: Payment;
  defaultParty?: string;
}) {
  const [state, action, pending] = useActionState(savePayment, undefined);
  const party = payment ? `${payment.partyType === "reseller" ? "r" : "c"}:${payment.partyId}` : defaultParty;
  const customers = parties.filter((p) => p.value.startsWith("c:"));
  const resellers = parties.filter((p) => p.value.startsWith("r:"));

  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      {payment && <input type="hidden" name="id" value={payment.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={`pf-party-${payment?.id ?? "new"}`}>¿Quién debe? *</label>
          <select id={`pf-party-${payment?.id ?? "new"}`} name="party" defaultValue={party} required className={`${selectAutoCls} w-full`}>
            <option value="" disabled>Elige…</option>
            {customers.length > 0 && (
              <optgroup label="Compradores">
                {customers.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </optgroup>
            )}
            {resellers.length > 0 && (
              <optgroup label="Revendedores">
                {resellers.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor={`pf-concept-${payment?.id ?? "new"}`}>Concepto *</label>
          <input id={`pf-concept-${payment?.id ?? "new"}`} name="concept" required maxLength={160} defaultValue={payment?.concept} placeholder="Ej: Dunk Low Panda talla 9 — saldo" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`pf-amount-${payment?.id ?? "new"}`}>Valor (COP) *</label>
          <input id={`pf-amount-${payment?.id ?? "new"}`} name="amount" inputMode="numeric" required defaultValue={payment?.amount} placeholder="350000" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`pf-due-${payment?.id ?? "new"}`}>Fecha límite</label>
          <input id={`pf-due-${payment?.id ?? "new"}`} name="dueDate" type="date" defaultValue={payment?.dueDate} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor={`pf-notes-${payment?.id ?? "new"}`}>Notas</label>
        <input id={`pf-notes-${payment?.id ?? "new"}`} name="notes" maxLength={500} defaultValue={payment?.notes} className={inputCls} />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      {state?.ok && state.message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>}
      <button type="submit" disabled={pending} className={btnAccent}>
        {pending ? "Guardando…" : payment ? "Guardar cambios" : "Registrar pago"}
      </button>
    </form>
  );
}
