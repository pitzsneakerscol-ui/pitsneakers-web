"use client";

import { Fragment, useMemo, useState } from "react";
import { deleteItem, setStatus } from "@/app/revendedores/actions";
import { formatPrice } from "@/lib/format";
import {
  STALE_DAYS,
  daysInStock,
  expectedProfit,
  formatPercent,
  itemLabel,
  itemTotalCost,
  type Item,
} from "@/lib/reseller-shared";
import EditItemForm from "@/components/reseller/EditItemForm";
import SellForm from "@/components/reseller/SellForm";
import type { CatalogEntry } from "@/components/reseller/ItemFields";
import { btnGhost, cardCls, inputCls, selectAutoCls } from "@/components/reseller/ui";

type Panel = { id: number; mode: "edit" | "sell" } | null;
type Sort = "recientes" | "antiguos" | "utilidad" | "costo" | "estancados";

const SORTS: Record<Sort, string> = {
  recientes: "Más recientes",
  antiguos: "Más antiguos",
  estancados: "Más días en stock",
  utilidad: "Mayor utilidad esperada",
  costo: "Mayor inversión",
};

export default function InventoryTable({
  items,
  catalog,
  today,
  ownerName,
}: {
  items: Item[];
  catalog: CatalogEntry[];
  today: string;
  ownerName: string;
}) {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatusFilter] = useState<"" | "stock" | "reservado">("");
  const [sort, setSort] = useState<Sort>("recientes");
  const [panel, setPanel] = useState<Panel>(null);
  const [copied, setCopied] = useState(false);

  const bySlug = useMemo(() => new Map(catalog.map((c) => [c.slug, c])), [catalog]);
  const brands = useMemo(
    () => [...new Set(items.map((i) => i.brand).filter(Boolean))].sort(),
    [items]
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((i) => {
      if (brand && i.brand !== brand) return false;
      if (status && i.status !== status) return false;
      if (!needle) return true;
      return `${i.brand} ${i.name} ${i.colorway} ${i.sku} ${i.size} ${i.source}`
        .toLowerCase()
        .includes(needle);
    });
    const profit = (i: Item) => expectedProfit(i) ?? -Infinity;
    const sorters: Record<Sort, (a: Item, b: Item) => number> = {
      recientes: (a, b) => b.createdAt - a.createdAt,
      antiguos: (a, b) => a.createdAt - b.createdAt,
      estancados: (a, b) => daysInStock(b, today) - daysInStock(a, today),
      utilidad: (a, b) => profit(b) - profit(a),
      costo: (a, b) => itemTotalCost(b) - itemTotalCost(a),
    };
    return [...list].sort(sorters[sort]);
  }, [items, q, brand, status, sort, today]);

  const invested = rows.reduce((s, i) => s + itemTotalCost(i), 0);

  async function copyList() {
    const available = items.filter((i) => i.status === "stock" && i.expectedPrice > 0);
    const lines = available.map(
      (i) =>
        `• ${itemLabel(i)}${i.brand ? ` (${i.brand})` : ""} — talla ${i.size || "?"} — ${formatPrice(i.expectedPrice)}${i.condition === "usado" ? " — usado" : ""}`
    );
    const body = [
      `Disponibles de ${ownerName}:`,
      "",
      ...lines,
      "",
      "Escríbeme por WhatsApp para separar tu par.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia esta lista:", body);
    }
  }

  if (items.length === 0) {
    return (
      <div className={`${cardCls} px-6 py-14 text-center`}>
        <p className="font-display text-2xl tracking-wide">Tu inventario está vacío</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Agrega tu primer par arriba, o importa varios de una vez desde un archivo CSV (Excel).
        </p>
      </div>
    );
  }

  return (
    <section className={`${cardCls} p-4 sm:p-6`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="inv-q" className="sr-only">Buscar</label>
          <input id="inv-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por modelo, marca, talla, proveedor…" className={inputCls} />
        </div>
        <select aria-label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} className={selectAutoCls}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select aria-label="Estado" value={status} onChange={(e) => setStatusFilter(e.target.value as "" | "stock" | "reservado")} className={selectAutoCls}>
          <option value="">En stock y reservados</option>
          <option value="stock">Solo en stock</option>
          <option value="reservado">Solo reservados</option>
        </select>
        <select aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectAutoCls}>
          {Object.entries(SORTS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <button type="button" onClick={copyList} className={btnGhost}>
          {copied ? "¡Copiado!" : "Copiar lista para WhatsApp"}
        </button>
      </div>

      <p className="mt-3 text-xs text-muted">
        {rows.length} par{rows.length === 1 ? "" : "es"} · {formatPrice(invested)} invertidos
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
              <th className="py-2 pr-3 font-semibold">Par</th>
              <th className="px-3 py-2 font-semibold">Talla</th>
              <th className="px-3 py-2 text-right font-semibold">Costo</th>
              <th className="px-3 py-2 text-right font-semibold">Esperado</th>
              <th className="px-3 py-2 text-right font-semibold">Utilidad</th>
              <th className="px-3 py-2 font-semibold">Días</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
              <th className="py-2 pl-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const cat = i.catalogSlug ? bySlug.get(i.catalogSlug) : undefined;
              const img = i.imageUrl || cat?.image || "";
              const profit = expectedProfit(i);
              const margin = profit !== null && i.expectedPrice > 0 ? (profit / i.expectedPrice) * 100 : null;
              const days = daysInStock(i, today);
              const isOpen = panel?.id === i.id;
              return (
                <Fragment key={i.id}>
                  <tr className="border-b border-line/70 align-middle">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-lg bg-[#ebe8e2] object-contain" />
                        ) : (
                          <span className="h-12 w-12 shrink-0 rounded-lg bg-paper" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{i.name}</p>
                          <p className="truncate text-xs text-muted">
                            {[i.brand, i.colorway, i.condition === "usado" ? "Usado" : ""].filter(Boolean).join(" · ")}
                          </p>
                          {cat && (
                            <p className="text-[11px] text-muted">Tienda: {formatPrice(cat.price)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium">{i.size || "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatPrice(itemTotalCost(i))}
                      {i.extraCost > 0 && <span className="block text-[11px] text-muted">incl. {formatPrice(i.extraCost)} extra</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{i.expectedPrice > 0 ? formatPrice(i.expectedPrice) : <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {profit === null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className={profit >= 0 ? "text-emerald-700" : "text-accent"}>
                          {formatPrice(profit)}
                          {margin !== null && <span className="block text-[11px] text-muted">{formatPercent(margin)}</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={days >= STALE_DAYS ? "font-semibold text-accent" : ""}>{days}d</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${i.status === "reservado" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {i.status === "reservado" ? "Reservado" : "En stock"}
                      </span>
                    </td>
                    <td className="py-3 pl-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button type="button" onClick={() => setPanel(isOpen && panel?.mode === "sell" ? null : { id: i.id, mode: "sell" })} className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-ink/85">
                          Vender
                        </button>
                        <button type="button" onClick={() => setPanel(isOpen && panel?.mode === "edit" ? null : { id: i.id, mode: "edit" })} className="rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:border-ink">
                          Editar
                        </button>
                        <form action={setStatus}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="status" value={i.status === "reservado" ? "stock" : "reservado"} />
                          <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:border-ink">
                            {i.status === "reservado" ? "Liberar" : "Reservar"}
                          </button>
                        </form>
                        <form
                          action={deleteItem}
                          onSubmit={(e) => {
                            if (!window.confirm(`¿Eliminar "${itemLabel(i)}" talla ${i.size}? Esto no se puede deshacer.`)) e.preventDefault();
                          }}
                        >
                          <input type="hidden" name="id" value={i.id} />
                          <button type="submit" aria-label="Eliminar" className="rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent hover:border-accent">
                            Borrar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                  {isOpen && panel && (
                    <tr className="bg-paper/60">
                      <td colSpan={8} className="p-4 sm:p-6">
                        <h3 className="mb-4 font-display text-xl tracking-wide">
                          {panel.mode === "sell" ? `Registrar venta — ${itemLabel(i)} (talla ${i.size})` : `Editar — ${itemLabel(i)}`}
                        </h3>
                        {panel.mode === "sell" ? (
                          <SellForm item={i} today={today} onDone={() => setPanel(null)} />
                        ) : (
                          <EditItemForm item={i} catalog={catalog} today={today} onDone={() => setPanel(null)} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No hay pares con esos filtros.</p>
        )}
      </div>
    </section>
  );
}
