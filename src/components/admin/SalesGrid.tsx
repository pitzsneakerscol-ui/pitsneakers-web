"use client";

import { startTransition, useRef, useState } from "react";
import { saveSales, type SaleResult } from "@/app/admin/ventas/actions";
import { formatPrice } from "@/lib/format";
import { SALE_CHANNELS } from "@/lib/reseller-shared";
import { digits, findStock, parseDate, resolveReseller, stockOptionLabel, type GridReseller, type GridStock } from "@/lib/sales-match";
import { btnAccent, btnGhost, cardCls } from "@/components/reseller/ui";

type Col = "reseller" | "par" | "size" | "price" | "cost" | "fees" | "date" | "buyer" | "channel";
const COLS: { key: Col; label: string; w: string; ph?: string }[] = [
  { key: "reseller", label: "Revendedor", w: "w-36", ph: "andres…" },
  { key: "par", label: "Par", w: "w-64", ph: "empieza a escribir…" },
  { key: "size", label: "Talla", w: "w-20" },
  { key: "price", label: "Vendido en", w: "w-32", ph: "$" },
  { key: "cost", label: "Costo (opc.)", w: "w-28", ph: "$" },
  { key: "fees", label: "Gastos (opc.)", w: "w-28", ph: "$" },
  { key: "date", label: "Fecha", w: "w-32" },
  { key: "buyer", label: "Comprador (opc.)", w: "w-36" },
  { key: "channel", label: "Canal", w: "w-32" },
];

interface Row extends Record<Col, string> {
  id: number;
  itemId?: number;
  error?: string;
  done?: string;
}

let seq = 1;
const blank = (date: string): Row => ({ id: seq++, reseller: "", par: "", size: "", price: "", cost: "", fees: "", date, buyer: "", channel: "WhatsApp" });
const isEmpty = (r: Row) => !r.reseller && !r.par && !r.price;

const cell = "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition hover:border-line focus:border-ink focus:bg-paper-raised";

/** Hoja de ventas rápida: se escribe o se pega desde Excel y cada fila queda como venta del revendedor. */
export default function SalesGrid({ resellers, stock, today }: { resellers: GridReseller[]; stock: GridStock[]; today: string }) {
  const [rows, setRows] = useState<Row[]>(() => [blank(today)]);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const stockBy = (userId: number) => stock.filter((s) => s.userId === userId);

  const derive = (r: Row) => {
    const user = resolveReseller(resellers, r.reseller);
    const matched = user && r.par ? (r.itemId ? stock.find((s) => s.id === r.itemId && s.userId === user.id) ?? null : findStock(stock, user.id, r.par, r.size)) : null;
    const price = digits(r.price);
    const cost = digits(r.cost) || matched?.cost || 0;
    const date = parseDate(r.date, today);
    return { user, matched, price, profit: price - digits(r.fees) - cost, hasCost: cost > 0, dateOk: Boolean(date) };
  };

  const focusCell = (rowIdx: number, col: Col) => {
    requestAnimationFrame(() => tableRef.current?.querySelector<HTMLElement>(`[data-r="${rowIdx}"][data-c="${col}"]`)?.focus());
  };

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, error: undefined, done: undefined } : r)));

  function onChange(r: Row, col: Col, value: string) {
    const patch: Partial<Row> = { [col]: value };
    if (col === "reseller") patch.itemId = undefined;
    if (col === "par") {
      const user = resolveReseller(resellers, r.reseller);
      const opt = user ? stockBy(user.id).find((s) => stockOptionLabel(s) === value) : undefined;
      if (opt) {
        patch.itemId = opt.id;
        patch.size = opt.size;
        if (!r.price) patch.price = String(opt.expectedPrice || "");
      } else patch.itemId = undefined;
    }
    update(r.id, patch);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>, rowIdx: number, col: Col) {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      if (e.key === "ArrowDown" && col === "par") return; // en "Par" la flecha abajo abre la lista
      e.preventDefault();
      if (rowIdx === rows.length - 1) setRows((rs) => [...rs, blank(today)]);
      focusCell(rowIdx + 1, col);
    } else if (e.key === "ArrowUp" && col !== "par" && rowIdx > 0) {
      e.preventDefault();
      focusCell(rowIdx - 1, col);
    }
  }

  /** Pegar varias celdas desde Excel: se reparten por filas y columnas desde la celda donde se pegó. */
  function onPaste(e: React.ClipboardEvent<HTMLElement>, rowIdx: number, col: Col) {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, "").split("\n").filter((l, i, a) => l.trim() !== "" || i < a.length - 1).filter((l) => l.trim() !== "");
    const startCol = COLS.findIndex((c) => c.key === col);
    setRows((rs) => {
      const next = [...rs];
      lines.forEach((line, li) => {
        const idx = rowIdx + li;
        while (next.length <= idx) next.push(blank(today));
        const cur = { ...next[idx], error: undefined, done: undefined, itemId: undefined };
        line.split("\t").forEach((v, ci) => {
          const c = COLS[startCol + ci];
          if (c) cur[c.key] = v.trim();
        });
        next[idx] = cur;
      });
      return next;
    });
  }

  const live = rows.filter((r) => !isEmpty(r));
  const totals = live.reduce(
    (t, r) => {
      const d = derive(r);
      return { n: t.n + 1, sold: t.sold + d.price, profit: t.profit + (d.user ? d.profit : 0) };
    },
    { n: 0, sold: 0, profit: 0 }
  );

  function save() {
    const pending = rows.filter((r) => !isEmpty(r));
    if (pending.length === 0) return;
    const payload = pending.map((r) => {
      const d = derive(r);
      return { userId: d.user?.id ?? 0, itemId: r.itemId, name: r.par.replace(/·\s*talla.*$/i, "").trim(), size: r.size, price: r.price, cost: r.cost, fees: r.fees, date: r.date, buyer: r.buyer, channel: r.channel };
    });
    setSaving(true);
    setSummary(null);
    startTransition(async () => {
      let results: SaleResult[] = [];
      try {
        results = await saveSales(payload);
      } catch {
        results = payload.map(() => ({ ok: false, error: "No se pudo conectar. Intenta de nuevo." }));
      }
      const okCount = results.filter((x) => x.ok).length;
      setRows((rs) => {
        const ids = new Map(pending.map((r, i) => [r.id, results[i]]));
        const kept = rs.filter((r) => !(ids.get(r.id)?.ok)).map((r) => (ids.has(r.id) ? { ...r, error: ids.get(r.id)?.error } : r));
        return kept.length ? kept : [blank(today)];
      });
      setSummary(okCount ? `${okCount} ${okCount === 1 ? "venta guardada" : "ventas guardadas"}${okCount < pending.length ? ` · ${pending.length - okCount} con error (míralas en rojo)` : ""}.` : "No se guardó ninguna: revisa las filas en rojo.");
      setSaving(false);
    });
  }

  return (
    <section className={`${cardCls} p-4 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Registro rápido de ventas</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Escribe una fila por venta o <strong className="text-ink">pega varias desde Excel</strong> (columnas en este orden: revendedor, par, talla, precio, costo, gastos, fecha, comprador, canal). <kbd className="rounded border border-line px-1">Enter</kbd> baja a la siguiente fila.
            Si el par está en el inventario del revendedor, sale de ahí; si no, se crea ya vendido. Le aparece en su panel y le llega un aviso.
          </p>
        </div>
        <button type="button" onClick={() => { setRows([blank(today)]); setSummary(null); }} className={btnGhost}>Limpiar</button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table ref={tableRef} className="w-full min-w-[1280px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-paper text-[11px] uppercase tracking-wider text-muted">
              <th className="w-8 px-2 py-2 font-semibold">#</th>
              {COLS.map((c) => (
                <th key={c.key} className={`${c.w} px-1 py-2 font-semibold`}>{c.label}</th>
              ))}
              <th className="px-2 py-2 font-semibold">Resultado</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const d = derive(r);
              const list = d.user ? stockBy(d.user.id) : [];
              return (
                <tr key={r.id} className={`border-b border-line/70 ${r.error ? "bg-accent/10" : ""}`}>
                  <td className="px-2 text-xs text-muted">{ri + 1}</td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-1 py-1">
                      {c.key === "channel" ? (
                        <select
                          value={r.channel}
                          data-r={ri}
                          data-c={c.key}
                          onChange={(e) => onChange(r, c.key, e.target.value)}
                          onKeyDown={(e) => onKeyDown(e, ri, c.key)}
                          className={cell}
                        >
                          {SALE_CHANNELS.map((ch) => (
                            <option key={ch} value={ch}>{ch}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={r[c.key]}
                          data-r={ri}
                          data-c={c.key}
                          list={c.key === "reseller" ? "dl-resellers" : c.key === "par" ? `dl-par-${r.id}` : undefined}
                          inputMode={c.key === "price" || c.key === "cost" || c.key === "fees" ? "numeric" : undefined}
                          placeholder={c.ph}
                          aria-label={`${c.label}, fila ${ri + 1}`}
                          autoComplete="off"
                          onChange={(e) => onChange(r, c.key, e.target.value)}
                          onKeyDown={(e) => onKeyDown(e, ri, c.key)}
                          onPaste={(e) => onPaste(e, ri, c.key)}
                          className={`${cell} ${c.key === "price" || c.key === "cost" || c.key === "fees" ? "text-right tabular-nums" : ""}`}
                        />
                      )}
                      {c.key === "par" && (
                        <datalist id={`dl-par-${r.id}`}>
                          {list.slice(0, 600).map((s) => (
                            <option key={s.id} value={stockOptionLabel(s)} />
                          ))}
                        </datalist>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1 text-xs">
                    {r.error ? (
                      <span className="font-semibold text-accent">{r.error}</span>
                    ) : isEmpty(r) ? null : !d.user ? (
                      <span className="text-accent">Elige el revendedor</span>
                    ) : !r.par ? null : !d.dateOk ? (
                      <span className="text-accent">Fecha no válida</span>
                    ) : (
                      <span className={d.matched ? "text-emerald-700" : "text-amber-700"}>
                        {d.matched ? "✓ Del inventario" : "＋ Se crea ya vendido"}
                        {d.price > 0 && (
                          <span className={`ml-2 tabular-nums ${d.profit < 0 ? "text-accent" : "text-muted"}`}>
                            {d.hasCost ? "ganancia" : "neto"} {formatPrice(d.profit)}
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-1">
                    {rows.length > 1 && (
                      <button type="button" aria-label={`Quitar fila ${ri + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="rounded p-1 text-muted hover:text-accent">×</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="dl-resellers">
          {resellers.map((x) => (
            <option key={x.id} value={x.username}>{x.name}</option>
          ))}
        </datalist>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setRows((rs) => [...rs, blank(today)])} className={btnGhost}>+ Fila</button>
          <p className="text-sm text-muted">
            {totals.n} {totals.n === 1 ? "venta" : "ventas"} · vendido <strong className="text-ink">{formatPrice(totals.sold)}</strong> · {formatPrice(totals.profit)} neto
          </p>
        </div>
        <div className="flex items-center gap-3">
          {summary && <p role="status" className="text-sm font-semibold">{summary}</p>}
          <button type="button" onClick={save} disabled={saving || totals.n === 0} className={btnAccent}>
            {saving ? "Guardando…" : `Guardar ${totals.n || ""} ${totals.n === 1 ? "venta" : "ventas"}`.replace("  ", " ")}
          </button>
        </div>
      </div>
    </section>
  );
}
