import Link from "next/link";
import { redirect } from "next/navigation";
import { getBuyer } from "@/lib/buyers";
import { listBuyerOffers, type BuyerOfferStatus } from "@/lib/buyer-offers";
import { formatPrice } from "@/lib/format";
import { processingFee } from "@/lib/fees";
import { feeAfterPerk } from "@/lib/leagues";
import { getPerks } from "@/lib/perks";
import { cardCls } from "@/components/reseller/ui";
import { PayOfferForm } from "@/components/cuenta/CuentaForms";
import Thumb from "@/components/cuenta/Thumb";
import { answerOffer } from "@/app/cuenta/offer-actions";

const STATUS: Record<BuyerOfferStatus, { label: string; cls: string }> = {
  pendiente: { label: "Esperando respuesta", cls: "bg-amber-100 text-amber-800" },
  contraoferta: { label: "Te hicimos una contraoferta", cls: "bg-accent/10 text-accent" },
  aceptada: { label: "¡Aceptada! Falta pagar", cls: "bg-emerald-100 text-emerald-800" },
  pagada: { label: "Pagada", cls: "bg-emerald-600 text-white" },
  rechazada: { label: "Rechazada", cls: "bg-line text-muted" },
  retirada: { label: "Retirada", cls: "bg-line text-muted" },
  vencida: { label: "Vencida", cls: "bg-line text-muted" },
};

const when = (ts: number) => new Date(ts).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function OfertasPage() {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  const [offers, { perks }] = await Promise.all([listBuyerOffers(buyer.id), getPerks(buyer)]);

  if (offers.length === 0) {
    return (
      <div className={`${cardCls} px-6 py-14 text-center`}>
        <p className="font-display text-2xl tracking-wide">Aún no has hecho ofertas</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">Entra a un par del catálogo y toca “Hacer una oferta”. Te respondemos por aquí y por correo.</p>
        <Link href="/sneakers" className="btn-pop mt-5 inline-flex items-center justify-center rounded-full bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-wide text-white">Ver sneakers</Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {offers.map((o) => {
        const st = STATUS[o.status];
        const total = o.agreedAmount + feeAfterPerk(processingFee(o.agreedAmount), perks.feeDiscountPct);
        return (
          <li key={o.id} className={`${cardCls} p-4 sm:p-5`}>
            <div className="flex gap-4">
              <Thumb image={o.image} brand={o.brand} name={o.productName} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.brand ? `${o.brand} ` : ""}{o.productName}</p>
                    <p className="text-xs text-muted">{o.size && o.size !== "Única" ? `Talla ${o.size} · ` : ""}Precio {formatPrice(o.listPrice)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                </div>
                <p className="mt-2 text-sm">
                  Tu oferta: <strong>{formatPrice(o.amount)}</strong>
                  {o.status === "contraoferta" && <> · Contraoferta: <strong>{formatPrice(o.counterAmount)}</strong></>}
                </p>
                {o.responseNote && o.status !== "aceptada" && <p className="mt-1 text-sm text-muted">“{o.responseNote}”</p>}
                {o.status === "pendiente" && <p className="mt-1 text-xs text-muted">Te respondemos antes del {when(o.expiresAt)}.</p>}
              </div>
            </div>

            {o.status === "contraoferta" && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <form action={answerOffer}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="decision" value="aceptar" />
                  <button type="submit" className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110">Aceptar {formatPrice(o.counterAmount)}</button>
                </form>
                <form action={answerOffer}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="decision" value="rechazar" />
                  <button type="submit" className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition hover:border-ink">Rechazar</button>
                </form>
                <p className="w-full text-xs text-muted">Puedes responder hasta el {when(o.expiresAt)}.</p>
              </div>
            )}

            {o.status === "aceptada" && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm">
                  Precio acordado: <strong>{formatPrice(o.agreedAmount)}</strong> · Pagas <strong>{formatPrice(total)}</strong>{perks.feeDiscountPct >= 100 ? " (tu liga cubre el costo del pago en línea)" : " con el costo del pago en línea"}. Tienes hasta el <strong>{when(o.expiresAt)}</strong>.
                </p>
                <PayOfferForm id={o.id} name={buyer.name} phone={buyer.phone} city={buyer.city} label={`Pagar ${formatPrice(total)} con Wompi`} />
              </div>
            )}

            {(o.status === "pendiente" || o.status === "contraoferta" || o.status === "aceptada") && (
              <form action={answerOffer} className="mt-3">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="decision" value="retirar" />
                <button type="submit" className="text-[11px] font-semibold uppercase tracking-wide text-muted underline underline-offset-4 hover:text-accent">Retirar oferta</button>
              </form>
            )}
            {o.status === "pagada" && o.orderRef && <p className="mt-3 text-xs text-muted">Pedido {o.orderRef}. Un asesor te escribe por WhatsApp para coordinar el envío.</p>}
          </li>
        );
      })}
    </ul>
  );
}
