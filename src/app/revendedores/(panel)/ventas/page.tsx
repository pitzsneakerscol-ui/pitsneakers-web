import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listItems } from "@/lib/reseller";
import { setStatus } from "@/app/revendedores/actions";
import {
  daysBetween,
  formatPercent,
  itemLabel,
  itemTotalCost,
  realizedProfit,
} from "@/lib/reseller-shared";
import { formatPrice } from "@/lib/format";
import { cardCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Mis ventas" };

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const { mes } = await searchParams;
  const sold = (await listItems(user.id))
    .filter((i) => i.status === "vendido")
    .sort((a, b) => (b.soldDate ?? "").localeCompare(a.soldDate ?? ""));

  const months = [...new Set(sold.map((i) => (i.soldDate ?? "").slice(0, 7)).filter(Boolean))];
  const selected = mes && months.includes(mes) ? mes : "";
  const rows = selected ? sold.filter((i) => (i.soldDate ?? "").startsWith(selected)) : sold;

  const revenue = rows.reduce((s, i) => s + (i.soldPrice ?? 0), 0);
  const cost = rows.reduce((s, i) => s + itemTotalCost(i), 0);
  const fees = rows.reduce((s, i) => s + i.saleFees, 0);
  const profit = revenue - cost - fees;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Ventas</h1>
        <p className="mt-2 text-sm text-muted">Cada par vendido con su utilidad real.</p>
      </header>

      {sold.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="font-display text-2xl tracking-wide">Aún no registras ventas</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            En el inventario, usa el botón “Vender” de un par para registrar el precio, el canal y tus gastos.
          </p>
          <Link href="/revendedores/inventario" className="mt-5 inline-flex rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:bg-ink/85">Ir al inventario</Link>
        </div>
      ) : (
        <>
          <nav aria-label="Filtrar por mes" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
            <Link href="/revendedores/ventas" className={`rounded-full px-4 py-2 ${!selected ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>Todas</Link>
            {months.map((m) => (
              <Link key={m} href={`/revendedores/ventas?mes=${m}`} className={`rounded-full px-4 py-2 ${selected === m ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>{m}</Link>
            ))}
          </nav>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Facturado", formatPrice(revenue), ""],
              ["Costo de lo vendido", formatPrice(cost), ""],
              ["Gastos de venta", formatPrice(fees), ""],
              ["Ganancia", formatPrice(profit), profit >= 0 ? "text-emerald-700" : "text-accent"],
            ].map(([label, value, tone]) => (
              <div key={label} className={`${cardCls} p-5`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                <p className={`mt-2 font-display text-3xl tracking-wide ${tone}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-2 pr-3 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Par</th>
                  <th className="px-3 py-2 font-semibold">Talla</th>
                  <th className="px-3 py-2 text-right font-semibold">Costo</th>
                  <th className="px-3 py-2 text-right font-semibold">Venta</th>
                  <th className="px-3 py-2 text-right font-semibold">Gastos</th>
                  <th className="px-3 py-2 text-right font-semibold">Utilidad</th>
                  <th className="px-3 py-2 font-semibold">Días</th>
                  <th className="px-3 py-2 font-semibold">Canal</th>
                  <th className="py-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => {
                  const p = realizedProfit(i) ?? 0;
                  const m = (i.soldPrice ?? 0) > 0 ? (p / (i.soldPrice as number)) * 100 : null;
                  return (
                    <tr key={i.id} className="border-b border-line/70">
                      <td className="py-3 pr-3 tabular-nums text-muted">{i.soldDate}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{itemLabel(i)}</p>
                        <p className="text-xs text-muted">{[i.brand, i.buyer && `a ${i.buyer}`].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="px-3 py-3">{i.size || "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatPrice(itemTotalCost(i))}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatPrice(i.soldPrice ?? 0)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted">{i.saleFees ? formatPrice(i.saleFees) : "—"}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${p >= 0 ? "text-emerald-700" : "text-accent"}`}>
                        {formatPrice(p)}
                        {m !== null && <span className="block text-[11px] text-muted">{formatPercent(m)}</span>}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{i.purchaseDate && i.soldDate ? `${daysBetween(i.purchaseDate, i.soldDate)}d` : "—"}</td>
                      <td className="px-3 py-3 text-muted">{i.soldChannel || "—"}</td>
                      <td className="py-3 pl-3 text-right">
                        <form action={setStatus}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="status" value="stock" />
                          <button type="submit" title="Devuelve el par al inventario y borra los datos de la venta" className="rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:border-ink">
                            Reabrir
                          </button>
                        </form>
                      </td>
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
