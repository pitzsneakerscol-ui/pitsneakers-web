import type { Metadata } from "next";
import Link from "next/link";
import { listAllItems, listResellers } from "@/lib/admin";
import { STALE_DAYS, daysInStock, expectedProfit, itemLabel, itemTotalCost, todayBogota } from "@/lib/reseller-shared";
import { formatPrice } from "@/lib/format";
import { btnGhost, btnPrimary, cardCls, inputCls, selectAutoCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Inventario global" };

export default async function AdminInventory({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; rev?: string }>;
}) {
  const { q = "", estado = "activos", rev = "" } = await searchParams;
  const userId = Number(rev) || undefined;
  const status = ["activos", "stock", "reservado"].includes(estado) ? estado : "activos";
  const today = todayBogota();
  const [items, resellers] = await Promise.all([
    listAllItems({ q: q.trim().slice(0, 60), status, userId }),
    listResellers(),
  ]);
  const invested = items.reduce((s, i) => s + itemTotalCost(i), 0);
  const expected = items.reduce((s, i) => s + i.expectedPrice, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Inventario global</h1>
        <p className="mt-2 text-sm text-muted">Los pares de todos los revendedores, en un solo lugar (solo lectura).</p>
      </header>

      <form method="get" className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar modelo, marca, talla o revendedor…" className={inputCls} />
        </div>
        <select name="estado" defaultValue={status} aria-label="Estado" className={selectAutoCls}>
          <option value="activos">Stock y reservados</option>
          <option value="stock">Solo en stock</option>
          <option value="reservado">Solo reservados</option>
        </select>
        <select name="rev" defaultValue={rev} aria-label="Revendedor" className={selectAutoCls}>
          <option value="">Todos los revendedores</option>
          {resellers.map((r) => (
            <option key={r.id} value={r.id}>{r.displayName || r.username}</option>
          ))}
        </select>
        <button type="submit" className={btnPrimary}>Filtrar</button>
        <Link href="/admin/inventario" className={btnGhost}>Limpiar</Link>
      </form>

      <p className="text-xs text-muted">
        {items.length} par{items.length === 1 ? "" : "es"} · {formatPrice(invested)} invertidos · {formatPrice(expected)} esperados
        {items.length >= 300 && " · mostrando los 300 más recientes"}
      </p>

      <div className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No hay pares con esos filtros.</p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-semibold">Par</th>
                <th className="px-3 py-2 font-semibold">Revendedor</th>
                <th className="px-3 py-2 font-semibold">Talla</th>
                <th className="px-3 py-2 text-right font-semibold">Costo</th>
                <th className="px-3 py-2 text-right font-semibold">Esperado</th>
                <th className="px-3 py-2 text-right font-semibold">Utilidad</th>
                <th className="px-3 py-2 font-semibold">Días</th>
                <th className="py-2 pl-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const profit = expectedProfit(i);
                const days = daysInStock(i, today);
                return (
                  <tr key={i.id} className="border-b border-line/70">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{itemLabel(i)}</p>
                      <p className="text-xs text-muted">{i.brand}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/revendedores/${i.ownerId}`} className="hover:underline">{i.ownerName}</Link>
                    </td>
                    <td className="px-3 py-2.5">{i.size || "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(itemTotalCost(i))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{i.expectedPrice > 0 ? formatPrice(i.expectedPrice) : "—"}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${profit !== null && profit < 0 ? "text-accent" : "text-emerald-700"}`}>{profit === null ? "—" : formatPrice(profit)}</td>
                    <td className={`px-3 py-2.5 ${days >= STALE_DAYS ? "font-semibold text-accent" : ""}`}>{days}d</td>
                    <td className="py-2.5 pl-3 capitalize">{i.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
