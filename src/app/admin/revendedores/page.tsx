import type { Metadata } from "next";
import Link from "next/link";
import { listResellers } from "@/lib/admin";
import { ago } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { cardCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Revendedores" };

export default async function ResellersPage() {
  const rows = await listResellers();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Revendedores</h1>
        <p className="mt-2 text-sm text-muted">{rows.length} cuenta{rows.length === 1 ? "" : "s"} registrada{rows.length === 1 ? "" : "s"}.</p>
      </header>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="font-display text-2xl tracking-wide">Aún no hay revendedores</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Cuando se registren en /revendedores aparecerán aquí.</p>
        </div>
      ) : (
        <div className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-semibold">Revendedor</th>
                <th className="px-3 py-2 text-right font-semibold">En stock</th>
                <th className="px-3 py-2 text-right font-semibold">Invertido</th>
                <th className="px-3 py-2 text-right font-semibold">Vendidos</th>
                <th className="px-3 py-2 text-right font-semibold">Facturado</th>
                <th className="px-3 py-2 text-right font-semibold">Ganancia</th>
                <th className="px-3 py-2 font-semibold">Último ingreso</th>
                <th className="py-2 pl-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/70 align-middle">
                  <td className="py-3 pr-3">
                    <Link href={`/admin/revendedores/${r.id}`} className="font-medium hover:underline">{r.displayName || r.username}</Link>
                    <p className="text-xs text-muted">@{r.username}{r.email ? ` · ${r.email}` : " · sin correo"}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.stockCount}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPrice(r.invested)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.soldCount}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPrice(r.revenue)}</td>
                  <td className={`px-3 py-3 text-right tabular-nums ${r.profit >= 0 ? "text-emerald-700" : "text-accent"}`}>{formatPrice(r.profit)}</td>
                  <td className="px-3 py-3 text-muted">{ago(r.lastLogin)}</td>
                  <td className="py-3 pl-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${r.suspended ? "bg-accent/10 text-accent" : "bg-emerald-100 text-emerald-800"}`}>
                      {r.suspended ? "Suspendido" : "Activo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
