import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { computeStats, listItems } from "@/lib/reseller";
import {
  STALE_DAYS,
  daysInStock,
  expectedProfit,
  formatPercent,
  itemLabel,
  itemTotalCost,
  realizedProfit,
  todayBogota,
} from "@/lib/reseller-shared";
import { formatPrice } from "@/lib/format";
import { cardCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Panel" };

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className={`${cardCls} p-5`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={`mt-2 font-display text-3xl tracking-wide sm:text-4xl ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-accent" : ""}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Bars({
  rows,
}: {
  rows: Array<{ key: string; label: string; value: number; display: string; sub?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {r.display}
              {r.sub && <span className="ml-2 text-xs">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper">
            <div
              className={`h-full rounded-full ${r.value < 0 ? "bg-accent" : "bg-ink"}`}
              style={{ width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function PanelPage() {
  const user = await requireUser();
  const items = await listItems(user.id);
  const today = todayBogota();
  const s = computeStats(items, today);
  const openCount = s.stockCount + s.reservedCount;

  if (items.length === 0) {
    return (
      <div className={`${cardCls} mx-auto max-w-2xl px-6 py-16 text-center`}>
        <h1 className="font-display text-4xl tracking-wide">BIENVENIDO, {(user.displayName || user.username).toUpperCase()}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Aún no tienes pares registrados. Agrega el primero (o importa tu Excel) y aquí verás tu
          capital, tu utilidad esperada y tu ganancia real.
        </p>
        <Link href="/revendedores/inventario" className="mt-6 inline-flex rounded-full bg-accent px-7 py-3.5 text-xs font-semibold uppercase tracking-wide text-white hover:brightness-110">
          Agregar mis primeros pares
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Panel</h1>
          <p className="mt-2 text-sm text-muted">
            {openCount} par{openCount === 1 ? "" : "es"} en inventario · {s.soldCount} vendido{s.soldCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/revendedores/inventario" className="rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:bg-ink/85">
          Ir al inventario
        </Link>
      </header>

      <section aria-label="Inventario actual">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">Lo que tienes ahora</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Capital invertido" value={formatPrice(s.invested)} hint={`${s.stockCount} en stock · ${s.reservedCount} reservados`} />
          <Kpi label="Valor esperado" value={formatPrice(s.expectedValue)} hint={s.unpricedCount ? `${s.unpricedCount} par(es) sin precio esperado` : "Si vendes todo al precio esperado"} />
          <Kpi label="Utilidad esperada" value={formatPrice(s.expectedProfit)} tone={s.expectedProfit >= 0 ? "good" : "bad"} hint={s.expectedMargin !== null ? `Margen ${formatPercent(s.expectedMargin)}` : undefined} />
          <Kpi label="Días promedio en stock" value={s.avgDaysInStock === null ? "—" : `${s.avgDaysInStock} d`} hint={`Alerta desde ${STALE_DAYS} días`} />
        </div>
      </section>

      <section aria-label="Ventas">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">Lo que has vendido</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Ganancia este mes" value={formatPrice(s.monthProfit)} tone={s.monthProfit >= 0 ? "good" : "bad"} hint={`${s.monthCount} venta(s) · ${formatPrice(s.monthRevenue)} facturado`} />
          <Kpi label="Ganancia total" value={formatPrice(s.profitAll)} tone={s.profitAll >= 0 ? "good" : "bad"} hint={`${formatPrice(s.revenueAll)} facturado`} />
          <Kpi label="Retorno (ROI)" value={s.roiAll === null ? "—" : formatPercent(s.roiAll)} hint="Utilidad sobre lo invertido en lo vendido" />
          <Kpi label="Días promedio para vender" value={s.avgDaysToSell === null ? "—" : `${s.avgDaysToSell} d`} hint="Desde la compra hasta la venta" />
        </div>
      </section>

      {(s.stale.length > 0 || s.lossRisk.length > 0 || s.unpricedCount > 0) && (
        <section aria-label="Alertas" className={`${cardCls} border-accent/30 p-5 sm:p-6`}>
          <h2 className="font-display text-2xl tracking-wide">Atención</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            {s.stale.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Estancados (+{STALE_DAYS} días)</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {s.stale.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span className="truncate">{itemLabel(i)} <span className="text-muted">· T{i.size}</span></span>
                      <span className="shrink-0 tabular-nums text-muted">{daysInStock(i, today)} d</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.lossRisk.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Precio esperado bajo el costo</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {s.lossRisk.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span className="truncate">{itemLabel(i)} <span className="text-muted">· T{i.size}</span></span>
                      <span className="shrink-0 tabular-nums text-accent">{formatPrice(expectedProfit(i) ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.unpricedCount > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Sin precio esperado</p>
                <p className="mt-2 text-sm text-muted">
                  {s.unpricedCount} par(es) no tienen precio esperado, así que no cuentan en tu utilidad esperada.{" "}
                  <Link href="/revendedores/inventario" className="underline underline-offset-2 hover:text-ink">Completarlos</Link>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${cardCls} p-5 sm:p-6`}>
          <h2 className="font-display text-2xl tracking-wide">Ganancia por mes</h2>
          <p className="mb-5 mt-1 text-xs text-muted">Últimos 6 meses</p>
          <Bars
            rows={s.byMonth.map((m) => ({
              key: m.month,
              label: m.label.toUpperCase(),
              value: m.profit,
              display: formatPrice(m.profit),
              sub: `${m.count} venta${m.count === 1 ? "" : "s"}`,
            }))}
          />
        </section>
        <section className={`${cardCls} p-5 sm:p-6`}>
          <h2 className="font-display text-2xl tracking-wide">Dónde está tu capital</h2>
          <p className="mb-5 mt-1 text-xs text-muted">Inversión en stock por marca</p>
          {s.byBrand.length === 0 ? (
            <p className="text-sm text-muted">Sin pares en stock.</p>
          ) : (
            <Bars
              rows={s.byBrand.map((b) => ({
                key: b.brand,
                label: b.brand,
                value: b.invested,
                display: formatPrice(b.invested),
                sub: `${b.count} par${b.count === 1 ? "" : "es"}`,
              }))}
            />
          )}
        </section>
      </div>

      {s.recentSales.length > 0 && (
        <section className={`${cardCls} p-5 sm:p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-wide">Últimas ventas</h2>
            <Link href="/revendedores/ventas" className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4 hover:text-accent">Ver todas</Link>
          </div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {s.recentSales.map((i) => {
              const p = realizedProfit(i) ?? 0;
              return (
                <li key={i.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0 truncate">
                    {itemLabel(i)} <span className="text-muted">· T{i.size} · {i.soldDate}</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {formatPrice(i.soldPrice ?? 0)}
                    <span className={`ml-3 ${p >= 0 ? "text-emerald-700" : "text-accent"}`}>{p >= 0 ? "+" : ""}{formatPrice(p)}</span>
                    <span className="sr-only"> costo {formatPrice(itemTotalCost(i))}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
