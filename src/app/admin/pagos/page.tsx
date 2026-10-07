import type { Metadata } from "next";
import Link from "next/link";
import { PAYMENT_METHODS, getOverview, listCustomers, listPayments, listResellers } from "@/lib/admin";
import { deletePayment, markPaid, setPaymentStatus } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";
import { todayBogota } from "@/lib/reseller-shared";
import { btnGhost, cardCls } from "@/components/reseller/ui";
import Kpi from "@/components/admin/Kpi";
import ConfirmForm from "@/components/admin/ConfirmForm";
import PaymentForm from "@/components/admin/PaymentForm";

export const metadata: Metadata = { title: "Pagos" };

const FILTERS = [
  ["todos", "Todos"],
  ["pendiente", "Pendientes"],
  ["vencido", "Vencidos"],
  ["pagado", "Pagados"],
  ["cancelado", "Cancelados"],
] as const;

type Filter = (typeof FILTERS)[number][0];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; nuevo?: string }>;
}) {
  const { estado, nuevo = "" } = await searchParams;
  const filter: Filter = FILTERS.some(([k]) => k === estado) ? (estado as Filter) : "pendiente";
  const [payments, overview, customers, resellers] = await Promise.all([
    listPayments(filter),
    getOverview(),
    listCustomers(),
    listResellers(),
  ]);
  const parties = [
    ...customers.map((c) => ({ value: `c:${c.id}`, label: c.name })),
    ...resellers.map((r) => ({ value: `r:${r.id}`, label: `${r.displayName || r.username} (@${r.username})` })),
  ];
  const total = payments.filter((p) => p.status === "pendiente").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Pagos</h1>
        <p className="mt-2 text-sm text-muted">Lo que te deben compradores y revendedores, y lo que ya cobraste.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Pendiente" value={formatPrice(overview.pendingAmount)} hint={`${overview.pendingCount} pagos`} />
        <Kpi label="Vencido" value={formatPrice(overview.overdueAmount)} hint={`${overview.overdueCount} pagos`} tone={overview.overdueCount > 0 ? "bad" : undefined} />
        <Kpi label="Cobrado este mes" value={formatPrice(overview.collectedMonth)} tone="good" />
      </div>

      <details className={`${cardCls} p-5 sm:p-6`} open={Boolean(nuevo)}>
        <summary className="cursor-pointer font-display text-2xl tracking-wide">Registrar un pago pendiente</summary>
        <div className="mt-5">
          {parties.length === 0 ? (
            <p className="text-sm text-muted">
              Primero agrega un comprador en <Link href="/admin/compradores" className="underline">Compradores</Link>.
            </p>
          ) : (
            <PaymentForm parties={parties} defaultParty={nuevo} />
          )}
        </div>
      </details>

      <nav aria-label="Filtrar pagos" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/admin/pagos?estado=${k}`} className={`rounded-full px-4 py-2 ${filter === k ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {payments.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="font-display text-2xl tracking-wide">Nada por aquí</p>
          <p className="mt-2 text-sm text-muted">No hay pagos en este filtro.</p>
        </div>
      ) : (
        <>
          {filter !== "pagado" && filter !== "cancelado" && (
            <p className="text-xs text-muted">{payments.length} pago{payments.length === 1 ? "" : "s"} · {formatPrice(total)} por cobrar</p>
          )}
          <ul className="space-y-3">
            {payments.map((p) => (
              <li key={p.id} className={`${cardCls} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{p.partyName}
                      <span className="ml-2 text-xs font-normal text-muted">{p.partyType === "reseller" ? "revendedor" : "comprador"}</span>
                    </p>
                    <p className="text-sm text-muted">{p.concept}</p>
                    <p className="mt-1 text-xs text-muted">
                      {p.status === "pagado"
                        ? `Pagado el ${p.paidDate}${p.method ? ` · ${p.method}` : ""}`
                        : p.dueDate
                          ? `Vence ${p.dueDate}`
                          : "Sin fecha límite"}
                      {p.notes && ` · ${p.notes}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl tracking-wide tabular-nums">{formatPrice(p.amount)}</p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        p.status === "pagado" ? "bg-emerald-100 text-emerald-800" : p.status === "cancelado" ? "bg-paper text-muted" : p.overdue ? "bg-accent/10 text-accent" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {p.status === "pendiente" && p.overdue ? "Vencido" : p.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
                  {p.status === "pendiente" && (
                    <>
                      <form action={markPaid} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="paidDate" value={todayBogota()} />
                        <select name="method" aria-label="Método de pago" defaultValue="" className="rounded-lg border border-line bg-paper-raised px-3 py-2 text-xs">
                          <option value="">Método…</option>
                          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <button type="submit" className="rounded-full bg-emerald-700 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-emerald-800">Marcar pagado</button>
                      </form>
                      {p.partyEmail ? (
                        <Link
                          href={`/admin/correos?pago=${p.id}`}
                          className={btnGhost}
                        >
                          Enviar recordatorio
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">Sin correo registrado</span>
                      )}
                    </>
                  )}
                  {p.status === "pagado" && p.partyEmail && (
                    <Link href={`/admin/correos?pago=${p.id}&plantilla=pago_recibido`} className={btnGhost}>Enviar confirmación</Link>
                  )}
                  <ConfirmForm
                    action={setPaymentStatus}
                    fields={{ id: p.id, status: p.status === "pendiente" ? "cancelado" : "pendiente" }}
                    label={p.status === "pendiente" ? "Cancelar" : "Reabrir"}
                    confirm={p.status === "pagado" ? "¿Reabrir este pago? Se borrará la fecha y el método de pago." : undefined}
                    className={btnGhost}
                  />
                  <ConfirmForm
                    action={deletePayment}
                    fields={{ id: p.id }}
                    label="Borrar"
                    confirm={`¿Borrar el pago "${p.concept}" de ${p.partyName}? No se puede deshacer.`}
                    className={`${btnGhost} text-accent hover:border-accent`}
                  />
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink">Editar</summary>
                  <div className="mt-4">
                    <PaymentForm parties={parties} payment={p} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
