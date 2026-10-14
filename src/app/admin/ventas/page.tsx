import type { Metadata } from "next";
import Link from "next/link";
import { listAllItems, listResellers } from "@/lib/admin";
import { itemLabel, itemTotalCost, realizedProfit, todayBogota } from "@/lib/reseller-shared";
import { formatPrice } from "@/lib/format";
import { cardCls } from "@/components/reseller/ui";
import Kpi from "@/components/admin/Kpi";
import SalesGrid from "@/components/admin/SalesGrid";
import SalesTable from "@/components/admin/SalesTable";
import type { GridReseller, GridStock } from "@/lib/sales-match";

export const metadata: Metadata = { title: "Ventas de la red" };

export default async function AdminSales({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; rev?: string }>;
}) {
  const { mes, rev } = await searchParams;
  const [sold, resellers, active] = await Promise.all([
    listAllItems({ status: "vendido", limit: 3000 }),
    listResellers(),
    listAllItems({ status: "activos", limit: 4000 }),
  ]);
  const revId = Number(rev) || 0;
  const all = revId ? sold.filter((i) => i.ownerId === revId) : sold;
  const gridResellers: GridReseller[] = resellers.filter((r) => !r.suspended).map((r) => ({ id: r.id, username: r.username, name: r.displayName || r.username }));
  const gridStock: GridStock[] = active.map((i) => ({ id: i.id, userId: i.ownerId, label: itemLabel(i), size: i.size, expectedPrice: i.expectedPrice, cost: i.cost }));
  // Resumen por revendedor (sobre todas las ventas).
  const byReseller = new Map<number, { name: string; n: number; revenue: number; profit: number }>();
  for (const i of sold) {
    const cur = byReseller.get(i.ownerId) ?? { name: i.ownerName, n: 0, revenue: 0, profit: 0 };
    cur.n++; cur.revenue += i.soldPrice ?? 0; cur.profit += realizedProfit(i) ?? 0;
    byReseller.set(i.ownerId, cur);
  }
  const summary = [...byReseller.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
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
        <p className="mt-2 text-sm text-muted">Registra ventas a nombre de tus revendedores y mira todo lo que han vendido.</p>
      </header>

      <SalesGrid resellers={gridResellers} stock={gridStock} today={todayBogota()} />

      {summary.length > 0 && (
        <section className={`${cardCls} p-4 sm:p-6`}>
          <h2 className="font-display text-2xl tracking-wide">Ventas por revendedor</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
            <Link href={mes ? `/admin/ventas?mes=${mes}` : "/admin/ventas"} className={`rounded-full px-4 py-2 ${!revId ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>Todos</Link>
            {summary.map(([id, r]) => (
              <Link key={id} href={`/admin/ventas?rev=${id}${mes ? `&mes=${mes}` : ""}`} className={`rounded-full px-4 py-2 ${revId === id ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
                {r.name} · {r.n} · {formatPrice(r.revenue)}
              </Link>
            ))}
          </div>
        </section>
      )}

      {all.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="font-display text-2xl tracking-wide">Aún no hay ventas registradas</p>
        </div>
      ) : (
        <>
          <nav aria-label="Filtrar por mes" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
            <Link href={revId ? `/admin/ventas?rev=${revId}` : "/admin/ventas"} className={`rounded-full px-4 py-2 ${!selected ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>Todas</Link>
            {months.map((m) => (
              <Link key={m} href={`/admin/ventas?mes=${m}${revId ? `&rev=${revId}` : ""}`} className={`rounded-full px-4 py-2 ${selected === m ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>{m}</Link>
            ))}
          </nav>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Pares vendidos" value={String(rows.length)} />
            <Kpi label="Facturado" value={formatPrice(revenue)} />
            <Kpi label="Gastos de venta" value={formatPrice(fees)} />
            <Kpi label="Ganancia de la red" value={formatPrice(profit)} tone={profit >= 0 ? "good" : "bad"} />
          </div>

          <div className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
            <SalesTable
              key={`${revId}-${selected}-${rows.map((i) => i.id).join(",")}`}
              rows={rows.map((i) => ({ id: i.id, ownerId: i.ownerId, ownerName: i.ownerName, label: itemLabel(i), size: i.size, renamable: i.source === "Registrado por Pitsneakers", date: i.soldDate ?? "", price: i.soldPrice ?? 0, cost: i.cost, extraCost: i.extraCost, fees: i.saleFees, channel: i.soldChannel, buyer: i.buyer }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
