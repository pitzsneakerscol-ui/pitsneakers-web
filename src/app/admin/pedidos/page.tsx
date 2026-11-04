import type { Metadata } from "next";
import Link from "next/link";
import { listOrders, type OrderStatus } from "@/lib/catalog-orders";
import { shippingLine } from "@/lib/shipping-shared";
import { ago } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { isWompiConfigured, isWompiTest } from "@/lib/wompi";
import { siteConfig } from "@/config/site";
import { btnPrimary, cardCls, inputCls, selectAutoCls } from "@/components/reseller/ui";
import { CARRIERS, FULFILLMENT_CLS, FULFILLMENT_LABEL, FULFILLMENT_STEPS, LATE_HOURS, isLate, isToShip } from "@/lib/fulfillment-shared";
import { saveFulfillment } from "./actions";

export const metadata: Metadata = { title: "Pedidos web" };

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pagado: { label: "Pagado", cls: "bg-emerald-100 text-emerald-800" },
  pendiente: { label: "Sin pagar", cls: "bg-amber-100 text-amber-800" },
  rechazado: { label: "Rechazado", cls: "bg-line text-muted" },
  anulado: { label: "Anulado", cls: "bg-line text-muted" },
  error: { label: "Revisar", cls: "bg-accent/10 text-accent" },
};

const FILTERS = [
  ["todos", "Todos"],
  ["por-despachar", "Por despachar"],
  ["despachado", "En camino"],
  ["entregado", "Entregados"],
  ["incidencia", "Incidencias"],
  ["pendiente", "Sin pagar"],
] as const;

type SP = { f?: string; e?: string; ok?: string; m?: string };

export default async function PedidosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { f, e, ok, m } = await searchParams;
  const filter = FILTERS.some(([k]) => k === f) ? (f as (typeof FILTERS)[number][0]) : "todos";
  const all = await listOrders();
  const rows = all.filter((o) => {
    switch (filter) {
      case "por-despachar": return o.status === "pagado" && isToShip(o.fulfillment);
      case "despachado": return o.status === "pagado" && o.fulfillment === "despachado";
      case "entregado": return o.status === "pagado" && o.fulfillment === "entregado";
      case "incidencia": return o.status === "pagado" && o.fulfillment === "incidencia";
      case "pendiente": return o.status === "pendiente";
      default: return true;
    }
  });
  const paid = all.filter((o) => o.status === "pagado");
  const total = paid.reduce((s, o) => s + o.amount, 0);
  const toShip = paid.filter((o) => isToShip(o.fulfillment));
  const late = toShip.filter((o) => isLate(o.fulfillment, o.paidAt, o.createdAt));
  const inTransit = paid.filter((o) => o.fulfillment === "despachado").length;
  const incidents = paid.filter((o) => o.fulfillment === "incidencia").length;
  const configured = isWompiConfigured();
  const base = siteConfig.siteUrl.replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Pedidos web</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Compras que los clientes pagaron en la página con Wompi. Confirma el stock, devuelve el pago desde el panel de Wompi si ya no hay y lleva aquí el envío: al despachar con guía, el cliente recibe el correo y puede ver en qué va su pedido.
        </p>
      </header>

      {e ? <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">{e}</p> : null}
      {ok ? (
        <p role="status" className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">
          Pedido <span className="font-mono">{ok}</span> actualizado.
          {m === "1" ? " Le avisamos al cliente por correo." : m === "0" ? " No se pudo enviar el correo al cliente: avísale por WhatsApp." : ""}
        </p>
      ) : null}

      <section className={`${cardCls} p-4 text-sm sm:p-5`}>
        <p className="font-semibold">
          Wompi: {configured ? (isWompiTest() ? "conectado en modo de PRUEBAS (no cobra dinero real)" : "conectado en producción") : "sin configurar (el botón “Comprar ahora” está oculto)"}
        </p>
        {!configured && <p className="mt-1 text-muted">Faltan las variables WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET en Vercel.</p>}
        <p className="mt-2 text-muted">
          URL de eventos para el panel de Wompi: <code className="rounded bg-paper px-1.5 py-0.5 text-xs text-ink">{base}/api/wompi/eventos</code>
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Por despachar</p>
          <p className="font-display text-4xl tracking-wide text-accent">{toShip.length}</p>
          {late.length > 0 ? <p className="mt-1 text-xs font-semibold text-accent">{late.length} con más de {LATE_HOURS} h</p> : <p className="mt-1 text-xs text-muted">Al día</p>}
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">En camino</p>
          <p className="font-display text-4xl tracking-wide">{inTransit}</p>
          {incidents > 0 ? <p className="mt-1 text-xs font-semibold text-accent">{incidents} con incidencia</p> : null}
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pagados · total cobrado</p>
          <p className="font-display text-4xl tracking-wide">{paid.length}</p>
          <p className="mt-1 text-xs text-muted">{formatPrice(total)}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sin pagar</p>
          <p className="font-display text-4xl tracking-wide">{all.filter((o) => o.status === "pendiente").length}</p>
        </div>
      </div>

      <nav aria-label="Filtrar" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={k === "todos" ? "/admin/pedidos" : `/admin/pedidos?f=${k}`} className={`rounded-full px-4 py-2 ${filter === k ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>{filter === "todos" ? "Sin pedidos todavía." : "No hay pedidos en esta vista."}</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => {
            const st = STATUS[o.status];
            const isPaid = o.status === "pagado";
            const late48 = isPaid && isLate(o.fulfillment, o.paidAt, o.createdAt);
            return (
              <li key={o.id} id={o.reference} className={`${cardCls} p-4 sm:p-5 ${late48 ? "ring-1 ring-accent/60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.brand} {o.productName}</p>
                    <p className="text-xs text-muted">
                      {o.size && o.size !== "Única" ? `Talla ${o.size} · ` : ""}{o.condition} · <span className="font-mono">{o.reference}</span> · {ago(o.paidAt ?? o.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{formatPrice(o.amount)}</strong>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                    {isPaid ? <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${FULFILLMENT_CLS[o.fulfillment]}`}>{FULFILLMENT_LABEL[o.fulfillment]}</span> : null}
                    {late48 ? <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">Atrasado</span> : null}
                  </div>
                </div>
                <p className="mt-2 text-sm">
                  {o.buyerName} · {o.buyerCity} · <a className="underline" href={`mailto:${o.buyerEmail}`}>{o.buyerEmail}</a> ·{" "}
                  <a className="underline" target="_blank" rel="noreferrer" href={`https://wa.me/57${o.buyerPhone.replace(/\D/g, "").slice(-10)}`}>{o.buyerPhone}</a>
                  {o.paymentMethod ? <span className="text-muted"> · {o.paymentMethod}</span> : null}
                  {o.fee > 0 ? <span className="text-muted"> · incluye {formatPrice(o.fee)} de costo de pago</span> : null}
                  {o.discount > 0 ? <span className="text-muted"> · crédito {formatPrice(o.discount)} ({o.creditCode})</span> : null}
                </p>
                {o.shipAddress ? (
                  <p className="mt-1.5 rounded-lg bg-paper px-3 py-2 text-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Enviar a </span>
                    {shippingLine({ department: o.shipDepartment, city: o.buyerCity, address: o.shipAddress, complement: o.shipComplement })}
                    {o.shipDocument ? <span className="text-muted"> · CC {o.shipDocument}</span> : null}
                    {o.shipNotes ? <span className="block text-xs text-muted">Indicaciones: {o.shipNotes}</span> : null}
                  </p>
                ) : null}

                {isPaid ? (
                  <form action={saveFulfillment} className="mt-3 grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_1.4fr_auto] lg:items-end">
                    <input type="hidden" name="id" value={o.id} />
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Paso del envío
                      <select name="step" defaultValue={o.fulfillment || "por_preparar"} className={`${selectAutoCls} mt-1 block w-full normal-case tracking-normal`}>
                        {FULFILLMENT_STEPS.map((s) => (
                          <option key={s} value={s}>{FULFILLMENT_LABEL[s]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Transportadora
                      <select name="carrier" defaultValue={o.carrier} className={`${selectAutoCls} mt-1 block w-full normal-case tracking-normal`}>
                        <option value="">—</option>
                        {CARRIERS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Número de guía
                      <input name="tracking" defaultValue={o.tracking} maxLength={60} autoComplete="off" placeholder="Ej: 2203456789" className={`${inputCls} mt-1 normal-case tracking-normal`} />
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Nota interna
                      <input name="note" defaultValue={o.shipNote} maxLength={300} autoComplete="off" placeholder="Solo la ves tú" className={`${inputCls} mt-1 normal-case tracking-normal`} />
                    </label>
                    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
                      <label className="flex items-center gap-2 text-xs text-muted">
                        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-accent" />
                        Avisar al cliente por correo
                      </label>
                      <button type="submit" className={btnPrimary}>Guardar</button>
                    </div>
                    <p className="text-xs text-muted sm:col-span-2 lg:col-span-5">
                      El correo sale solo al pasar a <strong>Despachado</strong> (con la guía) o a <strong>Entregado</strong> (pide la reseña). Cliente:{" "}
                      <Link href={`/pedido/${o.reference}`} target="_blank" className="underline">ver lo que ve él</Link>
                      {o.shippedAt ? <span> · salió {ago(o.shippedAt)}</span> : null}
                    </p>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
