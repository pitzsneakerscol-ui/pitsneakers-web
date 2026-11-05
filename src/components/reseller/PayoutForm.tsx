"use client";

import { useActionState, useState } from "react";
import { savePayout } from "@/app/revendedores/payout-actions";
import { ACCOUNT_TYPES, PAYOUT_METHODS, PAYOUT_WINDOW, isPayoutMethod, isWallet, type PayoutInfo, type PayoutMethod } from "@/lib/payout-shared";
import { btnPrimary, cardCls, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

/** Dónde le consignamos al revendedor lo que vendió. Se llena una vez; sin esto los pagos quedan pendientes. */
export default function PayoutForm({ initial }: { initial: PayoutInfo | null }) {
  const [method, setMethod] = useState<PayoutMethod>(initial?.method ?? "Bancolombia");
  const [state, action, pending] = useActionState(savePayout, undefined);
  const wallet = isWallet(method);

  return (
    <form id="pago" onSubmit={submitWith(action)} className={`${cardCls} scroll-mt-24 space-y-4 p-5 sm:p-6`}>
      <div>
        <h2 className="font-display text-2xl tracking-wide">Datos de pago</h2>
        <p className="mt-1 text-sm text-muted">
          Aquí te consignamos lo que vendas, una vez entregado el pedido. El pago tarda {PAYOUT_WINDOW}. Solo los ves tú y el equipo de Pitsneakers.
        </p>
        {initial ? null : (
          <p className="mt-3 rounded-lg bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800">
            Todavía no nos das tus datos: sin ellos no podemos pagarte.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="po-method">¿Cómo quieres recibir el pago?</label>
          <select
            id="po-method"
            name="method"
            value={method}
            onChange={(e) => isPayoutMethod(e.target.value) && setMethod(e.target.value)}
            className={inputCls}
          >
            {PAYOUT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        {method === "Otro banco" ? (
          <div>
            <label className={labelCls} htmlFor="po-bank">Banco</label>
            <input id="po-bank" name="bank" maxLength={40} defaultValue={initial?.bank ?? ""} placeholder="Ej: Davivienda" className={inputCls} />
          </div>
        ) : null}
        {wallet ? null : (
          <div>
            <label className={labelCls} htmlFor="po-type">Tipo de cuenta</label>
            <select id="po-type" name="accountType" defaultValue={initial?.accountType || "ahorros"} className={inputCls}>
              {ACCOUNT_TYPES.map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="po-number">{wallet ? `Celular de tu ${method}` : "Número de cuenta"}</label>
          <input
            id="po-number"
            name="accountNumber"
            inputMode="numeric"
            maxLength={24}
            autoComplete="off"
            defaultValue={initial?.accountNumber ?? ""}
            placeholder={wallet ? "3001234567" : "Solo números"}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="po-doc">Cédula o NIT del titular</label>
          <input id="po-doc" name="document" inputMode="numeric" maxLength={14} autoComplete="off" defaultValue={initial?.document ?? ""} placeholder="Solo números" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="po-holder">Nombre completo del titular</label>
        <input id="po-holder" name="holder" maxLength={80} autoComplete="off" defaultValue={initial?.holder ?? ""} placeholder="Como figura en la cuenta" className={inputCls} />
      </div>

      {state?.error ? <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p> : null}
      {state?.ok && state.message ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p> : null}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Guardando…" : initial ? "Actualizar datos de pago" : "Guardar datos de pago"}
      </button>
    </form>
  );
}
