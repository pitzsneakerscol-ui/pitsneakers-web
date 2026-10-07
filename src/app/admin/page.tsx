import type { Metadata } from "next";
import Link from "next/link";
import { getOverview, listEmailLog, listPayments, listResellers } from "@/lib/admin";
import { isEmailConfigured } from "@/lib/email";
import { ago, fmtDateTime } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { cardCls } from "@/components/reseller/ui";
import Kpi from "@/components/admin/Kpi";

export const metadata: Metadata = { title: "Resumen del dueño" };

export default async function AdminHome() {
  const [o, overdue, resellers, mails] = await Promise.all([
    getOverview(),
    listPayments("vencido"),
    listResellers(),
    listEmailLog(6),
  ]);
  const cutoff = o.generatedAt - 30 * 86_400_000;
  const inactive = resellers
    .filter((r) => !r.suspended && r.stockCount > 0 && (r.lastLogin === null || r.lastLogin < cutoff))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Resumen</h1>
        <p className="mt-2 text-sm text-muted">Todo lo que pasa en Pitsneakers y su red de revendedores.</p>
      </header>

      {!isEmailConfigured() && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El envío de correos aún no está activo: faltan <code>RESEND_API_KEY</code> y <code>EMAIL_FROM</code>. Mira el README para activarlo.
        </p>
      )}

      <section aria-labelledby="k-pagos">
        <h2 id="k-pagos" className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Pagos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Pendiente de cobro" value={formatPrice(o.pendingAmount)} hint={`${o.pendingCount} pago${o.pendingCount === 1 ? "" : "s"}`} />
          <Kpi label="Vencido" value={formatPrice(o.overdueAmount)} hint={`${o.overdueCount} pago${o.overdueCount === 1 ? "" : "s"} pasados de fecha`} tone={o.overdueCount > 0 ? "bad" : undefined} />
          <Kpi label="Cobrado este mes" value={formatPrice(o.collectedMonth)} tone="good" />
          <Kpi label="Compradores" value={String(o.customers)} hint="en tu libreta" />
        </div>
      </section>

      <section aria-labelledby="k-red">
        <h2 id="k-red" className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Red de revendedores</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Revendedores" value={String(o.resellers)} hint={`${o.activeResellers30d} activos en 30 días${o.suspended ? ` · ${o.suspended} suspendidos` : ""}`} />
          <Kpi label="Pares en stock" value={String(o.stockPairs)} hint={`${formatPrice(o.invested)} invertidos`} />
          <Kpi label="Valor esperado" value={formatPrice(o.expectedValue)} hint="si todo se vende al precio fijado" />
          <Kpi label="Ventas del mes" value={String(o.soldMonthCount)} hint={`${formatPrice(o.soldMonthRevenue)} · ganancia ${formatPrice(o.soldMonthProfit)}`} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${cardCls} p-5 sm:p-6`}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-wide">Pagos vencidos</h2>
            <Link href="/admin/pagos?estado=vencido" className="text-xs font-semibold uppercase tracking-wide text-accent">Ver todos</Link>
          </div>
          {overdue.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nada vencido.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line/70 text-sm">
              {overdue.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.partyName}</span>
                    <span className="block truncate text-xs text-muted">{p.concept} · venció {p.dueDate}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-accent">{formatPrice(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardCls} p-5 sm:p-6`}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-wide">Revendedores sin actividad</h2>
            <Link href="/admin/revendedores" className="text-xs font-semibold uppercase tracking-wide text-accent">Ver todos</Link>
          </div>
          {inactive.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Todos tienen movimiento reciente.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line/70 text-sm">
              {inactive.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/revendedores/${r.id}`} className="min-w-0 hover:underline">
                    <span className="block truncate font-medium">{r.displayName || r.username}</span>
                    <span className="block text-xs text-muted">{r.stockCount} pares en stock · último ingreso {ago(r.lastLogin)}</span>
                  </Link>
                  {r.email && (
                    <Link href={`/admin/correos?rev=${r.id}&plantilla=stock_inactivo`} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:border-ink">Escribir</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-wide">Últimos correos</h2>
          <Link href="/admin/correos" className="text-xs font-semibold uppercase tracking-wide text-accent">Redactar</Link>
        </div>
        {mails.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aún no has enviado correos desde aquí. Este mes: {o.emailsMonth}.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 text-sm">
            {mails.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.subject}</span>
                  <span className="block truncate text-xs text-muted">{m.toName ? `${m.toName} · ` : ""}{m.toEmail} · {fmtDateTime(m.createdAt)}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${m.status === "enviado" ? "bg-emerald-100 text-emerald-800" : "bg-accent/10 text-accent"}`}>{m.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
