"use client";

import { useActionState, useMemo, useState } from "react";
import { registerSale } from "@/app/admin/pedidos/nuevo/actions";
import { SALE_METHODS, SALE_STEPS, type SaleProduct, type SaleState } from "@/lib/sale-shared";
import { DEPARTMENTS } from "@/lib/shipping-shared";
import { formatPrice } from "@/lib/format";
import { btnPrimary, cardCls, inputCls, labelCls, selectAutoCls, submitWith } from "@/components/reseller/ui";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Formulario para registrar una venta cerrada por WhatsApp: se elige el par ya cargado en la página y se llenan los datos del cliente. */
export default function SaleForm({ products, emailOn }: { products: SaleProduct[]; emailOn: boolean }) {
  const [state, action, pending] = useActionState<SaleState, FormData>(registerSale, {});
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<SaleProduct | null>(null);
  const [size, setSize] = useState("");
  const [amount, setAmount] = useState("");

  const results = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return products
      .filter((p) => {
        const hay = norm(`${p.brand} ${p.name} ${p.colorway}`);
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 8);
  }, [products, query]);

  function choose(p: SaleProduct) {
    setPicked(p);
    setSize(p.sizes.length === 1 ? p.sizes[0] : "");
    setAmount(String(p.price));
    setQuery("");
  }

  return (
    <form onSubmit={submitWith(action)} className="space-y-6">
      {state.error ? <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">{state.error}</p> : null}

      <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider">1 · El par</h2>
        <input type="hidden" name="productId" value={picked?.id ?? ""} />

        {picked ? (
          <div className="flex items-center gap-4 rounded-lg border border-line p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {picked.image ? <img src={picked.image} alt="" className="h-20 w-20 rounded-lg bg-paper object-cover" /> : null}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{picked.name}</p>
              <p className="text-muted">{[picked.brand, picked.colorway, picked.condition].filter(Boolean).join(" · ")}</p>
              <p className="text-muted">Precio en la página: {formatPrice(picked.price)}</p>
            </div>
            <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold uppercase tracking-wide text-muted underline">Cambiar</button>
          </div>
        ) : (
          <div>
            <label className={labelCls} htmlFor="q">Busca por marca, modelo o color</label>
            <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej. jordan 4 military" autoComplete="off" className={inputCls} />
            {query.trim() && results.length === 0 ? <p className="mt-2 text-sm text-muted">No hay pares con eso en el catálogo.</p> : null}
            {results.length > 0 ? (
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => choose(p)} className="flex w-full items-center gap-3 bg-paper-raised p-2.5 text-left transition hover:bg-paper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image ? <img src={p.image} alt="" className="h-12 w-12 rounded-md bg-paper object-cover" /> : <span className="h-12 w-12 rounded-md bg-paper" />}
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="block truncate text-xs text-muted">{[p.brand, p.colorway, p.condition].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="text-sm font-semibold">{formatPrice(p.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {picked ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="size">Talla</label>
              {picked.sizes.length > 0 ? (
                <select id="size" name="size" value={size} onChange={(e) => setSize(e.target.value)} className={`${selectAutoCls} w-full`} required>
                  <option value="">Elige la talla</option>
                  {picked.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input id="size" name="size" value="Única" readOnly className={inputCls} />
              )}
            </div>
            <div>
              <label className={labelCls} htmlFor="amount">Precio acordado (COP)</label>
              <input id="amount" name="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} className={inputCls} required />
              {amount ? <p className="mt-1 text-xs text-muted">{formatPrice(Number(amount))}</p> : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider">2 · El cliente</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls} htmlFor="name">Nombre y apellido</label><input id="name" name="name" autoComplete="off" className={inputCls} required /></div>
          <div><label className={labelCls} htmlFor="phone">Celular</label><input id="phone" name="phone" inputMode="tel" placeholder="3001234567" className={inputCls} required /></div>
          <div className="sm:col-span-2"><label className={labelCls} htmlFor="email">Correo (ahí le llega el proceso)</label><input id="email" name="email" type="email" className={inputCls} required /></div>
          <div>
            <label className={labelCls} htmlFor="department">Departamento</label>
            <select id="department" name="department" defaultValue="" className={`${selectAutoCls} w-full`} required>
              <option value="">Elige</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div><label className={labelCls} htmlFor="city">Ciudad</label><input id="city" name="city" className={inputCls} required /></div>
          <div className="sm:col-span-2"><label className={labelCls} htmlFor="address">Dirección</label><input id="address" name="address" placeholder="Calle 10 # 20-30" className={inputCls} required /></div>
          <div><label className={labelCls} htmlFor="complement">Barrio / apto / torre (opcional)</label><input id="complement" name="complement" className={inputCls} /></div>
          <div><label className={labelCls} htmlFor="document">Cédula (opcional)</label><input id="document" name="document" inputMode="numeric" className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls} htmlFor="notes">Notas de entrega (opcional)</label><input id="notes" name="notes" className={inputCls} /></div>
        </div>
      </section>

      <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider">3 · Pago y proceso</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="method">¿Cómo pagó?</label>
            <select id="method" name="method" defaultValue="Transferencia" className={`${selectAutoCls} w-full`}>
              {SALE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="step">¿En qué paso está el par?</label>
            <select id="step" name="step" defaultValue="por_preparar" className={`${selectAutoCls} w-full`}>
              {SALE_STEPS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="notify" defaultChecked={emailOn} disabled={!emailOn} className="mt-0.5 h-4 w-4" />
          <span>
            Mandarle al cliente el correo de confirmación con la foto del par y el enlace para seguir su pedido.
            {emailOn ? null : <span className="block text-xs text-muted">El correo no está configurado: avísale por WhatsApp con el enlace del pedido.</span>}
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending || !picked} className={btnPrimary}>{pending ? "Registrando…" : "Registrar venta"}</button>
        <p className="text-xs text-muted">Se crea como pagada. El stock del catálogo no cambia solo: actualízalo aparte.</p>
      </div>
    </form>
  );
}
