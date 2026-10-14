"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { undoSale, updateSale, type SaleEdit } from "@/app/admin/ventas/actions";
import { formatPrice } from "@/lib/format";
import { SALE_CHANNELS } from "@/lib/reseller-shared";
import { digits } from "@/lib/sales-match";

export interface SaleRow {
  id: number;
  ownerId: number;
  ownerName: string;
  label: string;
  size: string;
  /** el administrador lo creó al registrar la venta: se puede renombrar */
  renamable: boolean;
  date: string;
  price: number;
  cost: number;
  extraCost: number;
  fees: number;
  channel: string;
  buyer: string;
}

type Field = SaleEdit["field"];
const input = "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition hover:border-line focus:border-ink focus:bg-paper-raised";

/** Tabla de ventas editable: se corrige cualquier celda y se guarda al salir de ella (o con Enter). */
export default function SalesTable({ rows: initial }: { rows: SaleRow[] }) {
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [, start] = useTransition();

  const keyOf = (id: number, f: Field) => `${id}:${f}`;

  function patchLocal(id: number, f: Field, value: string) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        switch (f) {
          case "price": return { ...r, price: digits(value) };
          case "cost": return { ...r, cost: digits(value) };
          case "fees": return { ...r, fees: digits(value) };
          case "date": return { ...r, date: value };
          case "buyer": return { ...r, buyer: value };
          case "channel": return { ...r, channel: value };
          case "size": return { ...r, size: value };
          default: return { ...r, label: value };
        }
      })
    );
  }

  function commit(id: number, f: Field, value: string, original: string) {
    if (value === original) return;
    start(async () => {
      const res = await updateSale({ id, field: f, value });
      setSaved((s) => ({ ...s, [keyOf(id, f)]: res.ok ? "ok" : (res.error ?? "No se guardó") }));
      if (res.ok && res.value !== undefined && (f === "date" || f === "price" || f === "cost" || f === "fees")) patchLocal(id, f, res.value);
      if (res.ok) {
        setTimeout(() => setSaved((s) => {
          const n = { ...s };
          delete n[keyOf(id, f)];
          return n;
        }), 1800);
      }
    });
  }

  const cellOf = (r: SaleRow, f: Field, value: string, opts: { numeric?: boolean; readOnly?: boolean } = {}) => {
    const st = saved[keyOf(r.id, f)];
    return (
      <div className="relative">
        <input
          defaultValue={value}
          readOnly={opts.readOnly}
          inputMode={opts.numeric ? "numeric" : undefined}
          aria-label={`${f} de la venta ${r.id}`}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          onBlur={(e) => {
            const v = e.currentTarget.value;
            if (opts.readOnly) return;
            patchLocal(r.id, f, v);
            commit(r.id, f, v, value);
          }}
          className={`${input} ${opts.numeric ? "text-right tabular-nums" : ""} ${st && st !== "ok" ? "!border-accent" : ""} ${opts.readOnly ? "cursor-default text-muted" : ""}`}
        />
        {st === "ok" && <span aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-emerald-700">✓</span>}
        {st && st !== "ok" && <p role="alert" className="absolute left-0 top-full z-10 mt-0.5 whitespace-nowrap rounded bg-accent px-2 py-0.5 text-[11px] text-white">{st}</p>}
      </div>
    );
  };

  return (
    <table className="w-full min-w-[1180px] text-left text-sm">
      <thead>
        <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
          <th className="px-1 py-2 font-semibold">Fecha</th>
          <th className="px-1 py-2 font-semibold">Par</th>
          <th className="px-1 py-2 font-semibold">Talla</th>
          <th className="px-3 py-2 font-semibold">Revendedor</th>
          <th className="px-1 py-2 text-right font-semibold">Costo</th>
          <th className="px-1 py-2 text-right font-semibold">Gastos</th>
          <th className="px-1 py-2 text-right font-semibold">Vendido</th>
          <th className="px-3 py-2 text-right font-semibold">Ganancia</th>
          <th className="px-1 py-2 font-semibold">Canal</th>
          <th className="px-1 py-2 font-semibold">Comprador</th>
          <th className="py-2 pl-2 font-semibold"><span className="sr-only">Deshacer</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const profit = r.price - r.cost - r.extraCost - r.fees;
          return (
            <tr key={r.id} className="border-b border-line/70">
              <td className="w-32 px-1 py-1">{cellOf(r, "date", r.date)}</td>
              <td className="min-w-52 px-1 py-1">{cellOf(r, "name", r.label, { readOnly: !r.renamable })}</td>
              <td className="w-20 px-1 py-1">{cellOf(r, "size", r.size)}</td>
              <td className="px-3 py-1"><Link href={`/admin/revendedores/${r.ownerId}`} className="hover:underline">{r.ownerName}</Link></td>
              <td className="w-28 px-1 py-1">{cellOf(r, "cost", r.cost ? String(r.cost) : "", { numeric: true })}</td>
              <td className="w-28 px-1 py-1">{cellOf(r, "fees", r.fees ? String(r.fees) : "", { numeric: true })}</td>
              <td className="w-32 px-1 py-1">{cellOf(r, "price", String(r.price), { numeric: true })}</td>
              <td className={`whitespace-nowrap px-3 py-1 text-right tabular-nums ${profit < 0 ? "text-accent" : "text-emerald-700"}`}>{formatPrice(profit)}</td>
              <td className="w-36 px-1 py-1">
                <select
                  defaultValue={r.channel}
                  aria-label={`Canal de la venta ${r.id}`}
                  onChange={(e) => { patchLocal(r.id, "channel", e.target.value); commit(r.id, "channel", e.target.value, r.channel); }}
                  className={input}
                >
                  <option value="">—</option>
                  {SALE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td className="w-40 px-1 py-1">{cellOf(r, "buyer", r.buyer)}</td>
              <td className="py-1 pl-2 text-right">
                <form action={undoSale}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-xs font-semibold uppercase tracking-wide text-muted underline underline-offset-4 hover:text-accent" title="Quita la venta (si venía del inventario, el par vuelve a su stock)">Deshacer</button>
                </form>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
