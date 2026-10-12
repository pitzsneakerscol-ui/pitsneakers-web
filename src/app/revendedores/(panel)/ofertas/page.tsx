import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listOffers, type OfferStatus } from "@/lib/offers";
import { formatPrice } from "@/lib/format";
import { ago } from "@/lib/admin-shared";
import { cardCls } from "@/components/reseller/ui";
import OfferActions from "@/components/reseller/OfferActions";

export const metadata: Metadata = { title: "Ofertas por tus pares" };

const STATUS: Record<OfferStatus, { label: string; cls: string }> = {
  pendiente: { label: "Esperando tu respuesta", cls: "bg-amber-100 text-amber-800" },
  aceptada: { label: "Aceptada", cls: "bg-emerald-100 text-emerald-800" },
  rechazada: { label: "Rechazada", cls: "bg-line text-muted" },
  contraoferta: { label: "Contraofertaste", cls: "bg-accent/10 text-accent" },
};

export default async function OfertasPage() {
  const user = await requireUser();
  const offers = user.isAdmin ? [] : await listOffers(user.id);
  const pending = offers.filter((o) => o.status === "pendiente").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Ofertas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Cuando alguien ofrece por uno de tus pares, te avisamos aquí. Acepta, contraoferta o rechaza con un toque.
          {pending > 0 ? ` Tienes ${pending} por responder.` : ""}
        </p>
      </header>

      {offers.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="text-4xl" aria-hidden="true">💰</p>
          <p className="mt-2 font-display text-2xl tracking-wide">Aún no hay ofertas</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Si llega una oferta por alguno de tus pares, aparece aquí y te llega un aviso.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {offers.map((o) => {
            const profit = o.cost > 0 || o.expectedPrice > 0 ? o.amount - o.cost : null;
            const st = STATUS[o.status];
            return (
              <li key={o.id} className={`${cardCls} p-5 ${o.status === "pendiente" ? "border-accent/60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{o.itemName}</p>
                    <p className="text-xs text-muted">
                      {o.size ? `Talla ${o.size} · ` : ""}
                      {ago(o.createdAt)}
                      {o.validUntil ? ` · vigente hasta ${o.validUntil}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-paper p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Te ofrecen</p>
                    <p className="font-display text-3xl tracking-wide text-accent">{formatPrice(o.amount)}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-paper p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Tu precio esperado</p>
                    <p className="font-display text-3xl tracking-wide">{o.expectedPrice > 0 ? formatPrice(o.expectedPrice) : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-paper p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Tu utilidad con la oferta</p>
                    <p className={`font-display text-3xl tracking-wide ${profit !== null && profit < 0 ? "text-accent" : "text-emerald-700"}`}>
                      {profit === null ? "—" : formatPrice(profit)}
                    </p>
                    {o.cost > 0 && <p className="text-[11px] text-muted">Costo registrado: {formatPrice(o.cost)}</p>}
                  </div>
                </div>

                {o.note && <p className="mt-3 text-sm text-muted">“{o.note}”</p>}

                {o.status === "pendiente" ? (
                  <OfferActions id={o.id} />
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    {o.status === "contraoferta" ? `Pediste ${formatPrice(o.counterAmount)}. ` : ""}
                    {o.responseNote ? `“${o.responseNote}” · ` : ""}
                    Respondida {o.respondedAt ? ago(o.respondedAt) : ""}.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
