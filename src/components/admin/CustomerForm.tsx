"use client";

import { useActionState } from "react";
import { saveCustomer } from "@/app/admin/actions";
import type { Customer } from "@/lib/admin";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

export default function CustomerForm({ customer }: { customer?: Customer }) {
  const [state, action, pending] = useActionState(saveCustomer, undefined);
  const k = customer?.id ?? "new";
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls} htmlFor={`cf-name-${k}`}>Nombre *</label>
          <input id={`cf-name-${k}`} name="name" required maxLength={80} defaultValue={customer?.name} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`cf-email-${k}`}>Correo</label>
          <input id={`cf-email-${k}`} name="email" type="email" maxLength={120} defaultValue={customer?.email} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`cf-wa-${k}`}>WhatsApp</label>
          <input id={`cf-wa-${k}`} name="whatsapp" inputMode="tel" maxLength={20} defaultValue={customer?.whatsapp} placeholder="573001234567" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor={`cf-notes-${k}`}>Notas</label>
        <input id={`cf-notes-${k}`} name="notes" maxLength={500} defaultValue={customer?.notes} placeholder="Tallas, gustos, cómo prefiere pagar…" className={inputCls} />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      {state?.ok && state.message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>}
      <button type="submit" disabled={pending} className={btnAccent}>
        {pending ? "Guardando…" : customer ? "Guardar cambios" : "Agregar comprador"}
      </button>
    </form>
  );
}
