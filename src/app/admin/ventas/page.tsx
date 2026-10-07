import type { Metadata } from "next";
import Link from "next/link";
import { listAllItems } from "@/lib/admin";
import { itemLabel, itemTotalCost, realizedProfit } from "@/lib/reseller-shared";
import { formatPrice } from "@/lib/format";
import { cardCls } from "@/components/reseller/ui";
import Kpi from "@/components/admin/Kpi";

export const metadata: Metadata = { title: "Ventas de la red" };

export default async function AdminSales({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const all = await listAllItems({ status: "vendido", limit: 1000 });
  const months = [...new Set(all.map((i) => (i.soldDate ?? "").slice(0, 7)).filter(Boolean))].sort().reverse();
  const selected = mes && months.includes(mes) ? mes : "";
  const rows = selected ? all.filter((i) => (i.soldDate ?? "").startsWith(selected)) : all;

  const revenue = rows.reduce((s, i) => s + (i.soldPrice ?? 0), 0);
  const cost = rows.reduce((s, i) => s + itemTotalCost(i), 0);
  const fees = rows.reduce((s, i) => s + i.saleFees, 0);
  const profit = revenue - cost - fees;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Ventas de la red</h1>
        <p className="mt-2 text-sm text-muted">Todo lo que han vendido tus revendedores.</p>
      </header>

      {all.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="font-display text-2xl tracking-wide">Aún no hay ventas registradas</p>
        </div>
      ) : (
        <>
          <nav aria-label="Filtrar por mes" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
            <Link href="/admin/ventas" className={`rounded-full px-4 py-2 ${!selected ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>Todas</Link>
            {months.map((m) => (
              <Link key={m} href={`/admin/ventas?mes=${m}`} className={`rounded-full px-4 py-2 ${selected === m ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>{m}</Link>
            ))}
          </nav>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Pares vendidos" value={String(rows.length)} />
            <Kpi label="Facturado" value={formatPrice(revenue)} />
            <Kpi label="Gastos de venta" value={formatPrice(fees)} />
            <Kpi label="Ganancia de la red" value={formatPrice(profit)} tone={profit >= 0 ? "good" : "bad"} />
          </div>

          <div className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-2 pr-3 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Par</th>
                  <th className="px-3 py-2 font-semibold">Revendedor</th>
                  <th className="px-3 py-2 text-right font-semibold">Costo</th>
                  <th className="px-3 py-2 text-right font-semibold">Vendido</th>
                  <th className="px-3 py-2 text-right font-semibold">Ganancia</th>
                  <th className="py-2 pl-3 font-semibold">Canal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => {
                  const p = realizedProfit(i);
                  return (
                    <tr key={i.id} className="border-b border-line/70">
                      <td className="py-2.5 pr-3">{i.soldDate}</td>
                      <td className="px-3 py-2.5">{itemLabel(i)} <span className="text-muted">· talla {i.size}</span></td>
                      <td className="px-3 py-2.5"><Link href={`/admin/revendedores/${i.ownerId}`} className="hover:underline">{i.ownerName}</Link></td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(itemTotalCost(i))}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(i.soldPrice ?? 0)}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${p !== null && p < 0 ? "text-accent" : "text-emerald-700"}`}>{p === null ? "—" : formatPrice(p)}</td>
                      <td className="py-2.5 pl-3 text-muted">{i.soldChannel || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
