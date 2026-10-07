import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReseller, listAllItems, listPayments } from "@/lib/admin";
import { setSuspended } from "@/app/admin/actions";
import { ago, fmtDay, waLink } from "@/lib/admin-shared";
import {
  daysInStock,
  expectedProfit,
  itemLabel,
  itemTotalCost,
  realizedProfit,
  todayBogota,
  STALE_DAYS,
} from "@/lib/reseller-shared";
import { formatPrice } from "@/lib/format";
import { btnGhost, cardCls } from "@/components/reseller/ui";
import Kpi from "@/components/admin/Kpi";
import ConfirmForm from "@/components/admin/ConfirmForm";
import ResetPassword from "@/components/admin/ResetPassword";

export const metadata: Metadata = { title: "Revendedor" };

export default async function ResellerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const r = await getReseller(id);
  if (!r) notFound();

  const today = todayBogota();
  const [items, payments] = await Promise.all([
    listAllItems({ userId: id, limit: 1000 }),
    listPayments("todos").then((all) => all.filter((p) => p.partyType === "reseller" && p.partyId === id)),
  ]);
  const active = items.filter((i) => i.status !== "vendido");
  const sold = items.filter((i) => i.status === "vendido");
  const owed = payments.filter((p) => p.status === "pendiente").reduce((s, p) => s + p.amount, 0);
  const name = r.displayName || r.username;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/revendedores" className="text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink">← Revendedores</Link>
          <h1 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">{name}</h1>
          <p className="mt-2 text-sm text-muted">
            @{r.username} · registrado el {fmtDay(r.createdAt)} · último ingreso {ago(r.lastLogin)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {r.email || "Sin correo"}
            {r.whatsapp && (
              <>
                {" · "}
                <a href={waLink(r.whatsapp)} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp +{r.whatsapp}</a>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {r.email && (
            <Link href={`/admin/correos?rev=${r.id}`} className={btnGhost}>Enviar correo</Link>
          )}
          <Link href={`/admin/pagos?nuevo=r:${r.id}`} className={btnGhost}>Registrar pago</Link>
          <ConfirmForm
            action={setSuspended}
            fields={{ id: r.id, suspend: r.suspended ? "0" : "1" }}
            label={r.suspended ? "Reactivar cuenta" : "Suspender cuenta"}
            confirm={r.suspended ? undefined : `¿Suspender a @${r.username}? No podrá ingresar y se cerrará su sesión.`}
            className={`${btnGhost} ${r.suspended ? "" : "text-accent hover:border-accent"}`}
          />
        </div>
      </header>

      {r.suspended && (
        <p className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">Esta cuenta está suspendida: no puede ingresar a su panel.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="En stock" value={String(r.stockCount)} hint={`${formatPrice(r.invested)} invertidos`} />
        <Kpi label="Valor esperado" value={formatPrice(r.expectedValue)} />
        <Kpi label="Ganancia realizada" value={formatPrice(r.profit)} hint={`${r.soldCount} vendidos · ${formatPrice(r.revenue)}`} tone={r.profit >= 0 ? "good" : "bad"} />
        <Kpi label="Pagos pendientes con él/ella" value={formatPrice(owed)} tone={owed > 0 ? "bad" : undefined} />
      </div>

      <section className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Inventario actual</h2>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sin pares en stock.</p>
        ) : (
          <table className="mt-3 w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-semibold">Par</th>
                <th className="px-3 py-2 font-semibold">Talla</th>
                <th className="px-3 py-2 text-right font-semibold">Costo</th>
                <th className="px-3 py-2 text-right font-semibold">Esperado</th>
                <th className="px-3 py-2 text-right font-semibold">Utilidad</th>
                <th className="px-3 py-2 font-semibold">Días</th>
                <th className="py-2 pl-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {active.map((i) => {
                const profit = expectedProfit(i);
                const days = daysInStock(i, today);
                return (
                  <tr key={i.id} className="border-b border-line/70">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{itemLabel(i)}</p>
                      <p className="text-xs text-muted">{i.brand}</p>
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
      </section>

      <section className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Ventas</h2>
        {sold.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sin ventas registradas.</p>
        ) : (
          <table className="mt-3 w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Par</th>
                <th className="px-3 py-2 text-right font-semibold">Vendido</th>
                <th className="px-3 py-2 text-right font-semibold">Ganancia</th>
                <th className="py-2 pl-3 font-semibold">Canal</th>
              </tr>
            </thead>
            <tbody>
              {sold.slice(0, 50).map((i) => {
                const p = realizedProfit(i);
                return (
                  <tr key={i.id} className="border-b border-line/70">
                    <td className="py-2.5 pr-3">{i.soldDate}</td>
                    <td className="px-3 py-2.5">{itemLabel(i)} <span className="text-muted">· talla {i.size}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(i.soldPrice ?? 0)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${p !== null && p < 0 ? "text-accent" : "text-emerald-700"}`}>{p === null ? "—" : formatPrice(p)}</td>
                    <td className="py-2.5 pl-3 text-muted">{i.soldChannel || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Pagos con este revendedor</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sin pagos registrados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line/70 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  {p.concept}
                  <span className="block text-xs text-muted">{p.dueDate ? `Vence ${p.dueDate}` : "Sin fecha"} · {p.status}{p.overdue ? " · VENCIDO" : ""}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Acceso</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Si olvidó su contraseña, genera una temporal y envíasela por WhatsApp.
        </p>
        <ResetPassword id={r.id} username={r.username} />
      </section>
    </div>
  );
}
