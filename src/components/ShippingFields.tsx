"use client";

import { DEPARTMENTS, EMPTY_SHIPPING, type ShippingData } from "@/lib/shipping-shared";
import { inputCls, labelCls } from "@/components/reseller/ui";

/** Campos de la dirección de entrega. Los nombres coinciden con `parseShipping`. */
export default function ShippingFields({ idPrefix, defaults = EMPTY_SHIPPING }: { idPrefix: string; defaults?: Partial<ShippingData> }) {
  const d = { ...EMPTY_SHIPPING, ...defaults };
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-3.5">
      <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Dirección de entrega</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-dep`} className={labelCls}>Departamento</label>
          <select id={`${idPrefix}-dep`} name="department" required defaultValue={d.department} autoComplete="address-level1" className={inputCls}>
            <option value="" disabled>Elige…</option>
            {DEPARTMENTS.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-city`} className={labelCls}>Ciudad o municipio</label>
          <input id={`${idPrefix}-city`} name="city" required defaultValue={d.city} autoComplete="address-level2" maxLength={60} className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-addr`} className={labelCls}>Dirección</label>
        <input id={`${idPrefix}-addr`} name="address" required defaultValue={d.address} autoComplete="address-line1" maxLength={120} placeholder="Ej. Calle 45 # 12-30" className={inputCls} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-comp`} className={labelCls}>Barrio, apto o torre (opcional)</label>
          <input id={`${idPrefix}-comp`} name="complement" defaultValue={d.complement} autoComplete="address-line2" maxLength={80} placeholder="Ej. Barrio Laureles, Apto 301" className={inputCls} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-doc`} className={labelCls}>Cédula (opcional)</label>
          <input id={`${idPrefix}-doc`} name="document" defaultValue={d.document} inputMode="numeric" maxLength={14} placeholder="Para la guía de envío" className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-notes`} className={labelCls}>Indicaciones de entrega (opcional)</label>
        <input id={`${idPrefix}-notes`} name="notes" defaultValue={d.notes} maxLength={200} placeholder="Ej. Portería, recibe mi mamá, horario de oficina" className={inputCls} />
      </div>
    </fieldset>
  );
}
