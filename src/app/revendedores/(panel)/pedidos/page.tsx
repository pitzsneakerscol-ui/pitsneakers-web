import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { backfillSellers, listSellerOrders } from "@/lib/catalog-orders";
import { getPayoutInfo } from "@/lib/seller-payout";
import { sellerStepsFor } from "@/lib/order-steps";
import { PAYOUT_CLS, PAYOUT_LABEL, PAYOUT_WINDOW, payoutDestination } from "@/lib/payout-shared";
import { FULFILLMENT_CLS, FULFILLMENT_LABEL } from "@/lib/fulfillment-shared";
import { formatPrice } from "@/lib/format";
import { cardCls } from "@/components/reseller/ui";
import OrderTimeline from "@/components/reseller/OrderTimeline";
import { sellerRules, verificationPointLines } from "@/lib/seller-confirm-shared";

export const metadata: Metadata = { title: "Pedidos" };

// El estado cambia cuando el equipo verifica, despacha o paga: siempre se lee de la base de datos.
export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const user = await requireUser();

  if (user.isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Pedidos</h1>
        <p className={`${cardCls} px-6 py-10 text-center text-sm text-muted`}>
          Esta sección es de los revendedores. Los pedidos de la tienda los gestionas en <Link href="/admin/pedidos" className="font-semibold text-ink underline">Admin → Pedidos web</Link>.
        </p>
      </div>
    );
  }

  await backfillSellers().catch(() => undefined);
  const [orders, payout] = await Promise.all([listSellerOrders(user.id), getPayoutInfo(user.id)]);

  const owed = orders.filter((o) => o.payoutStatus !== "pagado");
  const toCollect = owed.filter((o) => o.payoutStatus === "pendiente").reduce((s, o) => s + o.payoutAmount, 0);
  const processing = owed.filter((o) => o.payoutStatus === "en_proceso").reduce((s, o) => s + o.payoutAmount, 0);
  const received = orders.filter((o) => o.payoutStatus === "pagado").reduce((s, o) => s + o.payoutAmount, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Pedidos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Tus pares que ya vendimos en la plataforma, con el mismo seguimiento que ve el comprador: verificación, envío y entrega. Al final ves el estado de tu pago, que tarda {PAYOUT_WINDOW}.
        </p>
      </header>

      {payout ? (
        <p className={`${cardCls} px-4 py-3 text-sm`}>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Te pagamos a </span>
          <strong>{payoutDestination(payout)}</strong> · {payout.holder} ·{" "}
          <Link href="/revendedores/cuenta#pago" className="font-semibold underline">Cambiar</Link>
        </p>
      ) : (
        <div role="alert" className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Necesitamos tus datos de pago para consignarte.</p>
          <p className="mt-0.5">Sin ellos, tus pedidos quedan con el pago pendiente.{" "}
            <Link href="/revendedores/cuenta#pago" className="font-semibold underline">Agregarlos ahora</Link>
          </p>
        </div>
      )}

      {orders.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="text-4xl" aria-hidden="true">📦</p>
          <p className="mt-2 font-display text-2xl tracking-wide">Aún no tienes pedidos</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Cuando un cliente compre uno de tus pares en la página, aparece aquí con su seguimiento y te avisamos.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`${cardCls} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pago pendiente</p>
              <p className="mt-1 font-display text-3xl tracking-wide">{formatPrice(toCollect)}</p>
            </div>
            <div className={`${cardCls} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pago en proceso</p>
              <p className="mt-1 font-display text-3xl tracking-wide">{formatPrice(processing)}</p>
            </div>
            <div className={`${cardCls} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Ya te pagamos</p>
              <p className="mt-1 font-display text-3xl tracking-wide text-emerald-700">{formatPrice(received)}</p>
            </div>
          </div>

          <ul className="space-y-3">
            {orders.map((o) => {
              const steps = sellerStepsFor(o, Boolean(payout));
              const done = o.payoutStatus === "pagado";
              const current = steps.find((s) => !s.done);
              const name = `${o.brand} ${o.productName}`.replace(/^(\S+) \1 /, "$1 ");
              const incident = o.fulfillment === "incidencia";
              return (
                <li key={o.id} className={`${cardCls} p-4 sm:p-5`}>
                  <div className="flex items-start gap-4">
                    {o.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.image} alt="" className="h-20 w-20 flex-none rounded-xl bg-paper object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{name}</p>
                      <p className="text-xs text-muted">
                        {o.size && o.size !== "Única" ? `Talla ${o.size} · ` : ""}{o.condition} · Pedido nº {o.id}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {o.fulfillment ? (
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${FULFILLMENT_CLS[o.fulfillment]}`}>{FULFILLMENT_LABEL[o.fulfillment]}</span>
                        ) : null}
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${PAYOUT_CLS[o.payoutStatus]}`}>{PAYOUT_LABEL[o.payoutStatus]}</span>
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{done ? "Recibiste" : "Recibes"}</p>
                      <p className="font-display text-2xl tracking-wide">{formatPrice(o.payoutAmount)}</p>
                    </div>
                  </div>

                  {o.sellerConfirmedAt && !steps[1].done ? (
                    <div className="mt-4 rounded-xl border border-emerald-600/40 bg-emerald-600/5 p-4">
                      <p className="font-semibold">Confirmamos tu venta: deja tu par aquí</p>
                      <address className="mt-2 text-sm not-italic leading-relaxed">
                        {verificationPointLines().map((l, i) => (
                          <span key={l} className={i === 1 ? "block font-semibold" : "block"}>{l}</span>
                        ))}
                      </address>
                      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
                        {sellerRules().map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {incident ? (
                    <p className="mt-3 rounded-xl bg-accent/10 px-4 py-3 text-sm">Hay algo por resolver con el envío de este pedido. El equipo te escribe por WhatsApp.</p>
                  ) : null}

                  <details className="mt-4 border-t border-line pt-3" open={!done}>
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted">
                      {done ? "Ver el recorrido" : `Ahora: ${current?.title ?? "Completado"}`}
                    </summary>
                    <div className="mt-4">
                      <OrderTimeline steps={steps} incident={incident} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
