"use client";

import { useActionState, useMemo, useState } from "react";
import { registerSale } from "@/app/admin/pedidos/nuevo/actions";
import { MESSAGE_TYPES, type SaleProduct, type SaleState } from "@/lib/sale-shared";
import { CARRIERS, DIRECT_CARRIER } from "@/lib/fulfillment-shared";
import { DEPARTMENTS } from "@/lib/shipping-shared";
import { formatPrice } from "@/lib/format";
import { btnPrimary, cardCls, inputCls, labelCls, selectAutoCls, submitWith } from "@/components/reseller/ui";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Aviso al cliente de una venta cerrada por WhatsApp: el par (foto, talla, estado), nombre, correo y tipo de mensaje. */
export default function SaleForm({ products }: { products: SaleProduct[] }) {
  const [state, action, pending] = useActionState<SaleState, FormData>(registerSale, {});
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<SaleProduct | null>(null);
  const [size, setSize] = useState("");
  const [type, setType] = useState<string>("confirmada");
  const [carrier, setCarrier] = useState("");

  const results = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return products.filter((p) => tokens.every((t) => norm(`${p.brand} ${p.name} ${p.colorway}`).includes(t))).slice(0, 8);
  }, [products, query]);

  function choose(p: SaleProduct) {
    setPicked(p);
    setSize(p.sizes.length === 1 ? p.sizes[0] : "");
    setQuery("");
  }

  return (
    <form onSubmit={submitWith(action)} className="space-y-6">
      {state.error ? <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">{state.error}</p> : null}

      <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider">1 · El par que compró</h2>
        <input type="hidden" name="productId" value={picked?.id ?? ""} />

        {picked ? (
          <div className="flex items-center gap-4 rounded-lg border border-line p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {picked.image ? <img src={picked.image} alt="" className="h-24 w-24 rounded-lg bg-paper object-cover" /> : null}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{picked.name}</p>
              <p className="text-muted">{[picked.brand, picked.colorway].filter(Boolean).join(" · ")}</p>
              <p className="mt-1"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Estado </span>{picked.condition}</p>
              <p><span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Talla </span>{size || (picked.sizes.length ? "elige abajo" : "Única")}</p>
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
          <div className="max-w-xs">
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
        ) : null}
      </section>

      <section className={`${cardCls} space-y-4 p-4 sm:p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider">2 · El cliente y el mensaje</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls} htmlFor="name">Nombre</label><input id="name" name="name" autoComplete="off" className={inputCls} required /></div>
          <div><label className={labelCls} htmlFor="email">Correo</label><input id="email" name="email" type="email" autoComplete="off" className={inputCls} required /></div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="type">¿Qué mensaje se le manda?</label>
            <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} className={`${selectAutoCls} w-full`}>
              {MESSAGE_TYPES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          {type === "despachado" || type === "entregado" ? (
            <>
              <div>
                <label className={labelCls} htmlFor="carrier">Transportadora (la pones tú)</label>
                <select id="carrier" name="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className={`${selectAutoCls} w-full`} required={type === "despachado"}>
                  <option value="">{type === "despachado" ? "Elige" : "— (opcional)"}</option>
                  {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {carrier !== DIRECT_CARRIER ? (
                <div><label className={labelCls} htmlFor="tracking">Número de guía (a mano)</label><input id="tracking" name="tracking" autoComplete="off" className={inputCls} required={type === "despachado"} /></div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      <details className={`${cardCls} p-4 sm:p-5`}>
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wider">Opcional: celular y dirección</summary>
        <p className="mt-2 text-xs text-muted">Solo si los necesitas: la dirección hace falta para generar la guía de Skydropx después.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls} htmlFor="phone">Celular</label><input id="phone" name="phone" inputMode="tel" placeholder="3001234567" className={inputCls} /></div>
          <div>
            <label className={labelCls} htmlFor="department">Departamento</label>
            <select id="department" name="department" defaultValue="" className={`${selectAutoCls} w-full`}>
              <option value="">—</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div><label className={labelCls} htmlFor="city">Ciudad</label><input id="city" name="city" className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls} htmlFor="address">Dirección</label><input id="address" name="address" placeholder="Calle 10 # 20-30" className={inputCls} /></div>
          <div><label className={labelCls} htmlFor="complement">Barrio / apto / torre</label><input id="complement" name="complement" className={inputCls} /></div>
          <div><label className={labelCls} htmlFor="document">Cédula</label><input id="document" name="document" inputMode="numeric" className={inputCls} /></div>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending || !picked} className={btnPrimary}>{pending ? "Enviando…" : "Enviar mensaje al cliente"}</button>
        <p className="text-xs text-muted">Los siguientes avisos de este cliente los mandas desde su pedido, en la lista.</p>
      </div>
    </form>
  );
}
