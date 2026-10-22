import type { Metadata } from "next";
import Link from "next/link";
import { listOrders, type OrderStatus } from "@/lib/catalog-orders";
import { shippingLine } from "@/lib/shipping-shared";
import { ago } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { isWompiConfigured, isWompiTest } from "@/lib/wompi";
import { siteConfig } from "@/config/site";
import { cardCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Pedidos web" };

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pagado: { label: "Pagado", cls: "bg-emerald-100 text-emerald-800" },
  pendiente: { label: "Sin pagar", cls: "bg-amber-100 text-amber-800" },
  rechazado: { label: "Rechazado", cls: "bg-line text-muted" },
  anulado: { label: "Anulado", cls: "bg-line text-muted" },
  error: { label: "Revisar", cls: "bg-accent/10 text-accent" },
};

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter = f === "pagado" || f === "pendiente" ? f : "todos";
  const all = await listOrders();
  const rows = filter === "todos" ? all : all.filter((o) => o.status === filter);
  const paid = all.filter((o) => o.status === "pagado");
  const total = paid.reduce((s, o) => s + o.amount, 0);
  const configured = isWompiConfigured();
  const base = siteConfig.siteUrl.replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Pedidos web</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Compras que los clientes pagaron en la página con Wompi. Confirma el stock, devuelve el pago desde el panel de Wompi si ya no hay y coordina el envío por WhatsApp.</p>
      </header>

      <section className={`${cardCls} p-4 text-sm sm:p-5`}>
        <p className="font-semibold">
          Wompi: {configured ? (isWompiTest() ? "conectado en modo de PRUEBAS (no cobra dinero real)" : "conectado en producción") : "sin configurar (el botón “Comprar ahora” está oculto)"}
        </p>
        {!configured && <p className="mt-1 text-muted">Faltan las variables WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET en Vercel.</p>}
        <p className="mt-2 text-muted">
          URL de eventos para el panel de Wompi: <code className="rounded bg-paper px-1.5 py-0.5 text-xs text-ink">{base}/api/wompi/eventos</code>
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pagados</p>
          <p className="font-display text-4xl tracking-wide text-accent">{paid.length}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total cobrado</p>
          <p className="font-display text-4xl tracking-wide">{formatPrice(total)}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sin pagar</p>
          <p className="font-display text-4xl tracking-wide">{all.filter((o) => o.status === "pendiente").length}</p>
        </div>
      </div>

      <nav aria-label="Filtrar" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {([["todos", "Todos"], ["pagado", "Pagados"], ["pendiente", "Sin pagar"]] as const).map(([k, label]) => (
          <Link key={k} href={k === "todos" ? "/admin/pedidos" : `/admin/pedidos?f=${k}`} className={`rounded-full px-4 py-2 ${filter === k ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>Sin pedidos todavía.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => {
            const st = STATUS[o.status];
            return (
              <li key={o.id} className={`${cardCls} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.brand} {o.productName}</p>
                    <p className="text-xs text-muted">
                      {o.size && o.size !== "Única" ? `Talla ${o.size} · ` : ""}{o.condition} · <span className="font-mono">{o.reference}</span> · {ago(o.paidAt ?? o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>{formatPrice(o.amount)}</strong>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
