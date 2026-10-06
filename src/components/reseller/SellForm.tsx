"use client";

import { useActionState, useState } from "react";
import { sellItem } from "@/app/revendedores/actions";
import { formatPrice } from "@/lib/format";
import {
  SALE_CHANNELS,
  formatPercent,
  itemTotalCost,
  type ActionState,
  type Item,
} from "@/lib/reseller-shared";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

const digits = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;

export default function SellForm({
  item,
  today,
  onDone,
}: {
  item: Item;
  today: string;
  onDone: () => void;
}) {
  const [price, setPrice] = useState(item.expectedPrice ? String(item.expectedPrice) : "");
  const [fees, setFees] = useState("");
  const [state, action, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const res = await sellItem(prev, fd);
      if (res?.ok) onDone();
      return res;
    },
    undefined
  );

  const profit = digits(price) - itemTotalCost(item) - digits(fees);
  const margin = digits(price) > 0 ? (profit / digits(price)) * 100 : null;

  return (
    <form onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={item.id} />
      <div>
        <label className={labelCls} htmlFor={`sp-${item.id}`}>Precio de venta (COP) *</label>
        <input id={`sp-${item.id}`} name="soldPrice" required inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`sf-${item.id}`}>Gastos de la venta (envío, comisión)</label>
        <input id={`sf-${item.id}`} name="saleFees" inputMode="numeric" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0" className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`sd-${item.id}`}>Fecha de venta</label>
        <input id={`sd-${item.id}`} name="soldDate" type="date" max={today} defaultValue={today} className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`sc-${item.id}`}>Canal</label>
        <select id={`sc-${item.id}`} name="soldChannel" defaultValue="WhatsApp" className={inputCls}>
          {SALE_CHANNELS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor={`sb-${item.id}`}>Comprador (opcional)</label>
        <input id={`sb-${item.id}`} name="buyer" maxLength={80} placeholder="Nombre o @usuario" className={inputCls} />
      </div>

      <div className="rounded-lg bg-paper px-4 py-3 text-sm sm:col-span-2">
        Te costó <strong>{formatPrice(itemTotalCost(item))}</strong>
        {digits(price) > 0 && (
          <>
            {" "}→ utilidad real:{" "}
            <strong className={profit >= 0 ? "text-emerald-700" : "text-accent"}>{formatPrice(profit)}</strong>
            {margin !== null && <span className="text-muted"> · margen {formatPercent(margin)}</span>}
          </>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="flex justify-end sm:col-span-2">
        <button type="submit" disabled={pending} className={btnAccent}>
          {pending ? "Guardando…" : "Registrar venta"}
        </button>
      </div>
    </form>
  );
}
