import type { Metadata } from "next";
import Link from "next/link";
import { listAllBuyerOffers, type BuyerOfferStatus } from "@/lib/buyer-offers";
import { listBuyersForAdmin } from "@/lib/buyers";
import { formatPrice } from "@/lib/format";
import { ago } from "@/lib/admin-shared";
import { btnAccent, btnGhost, cardCls, inputCls } from "@/components/reseller/ui";
import { respondOffer } from "./actions";

export const metadata: Metadata = { title: "Ofertas de compradores" };

const STATUS: Record<BuyerOfferStatus, { label: string; cls: string }> = {
  pendiente: { label: "Sin responder", cls: "bg-amber-100 text-amber-800" },
  contraoferta: { label: "Esperando al comprador", cls: "bg-accent/10 text-accent" },
  aceptada: { label: "Aceptada · falta pagar", cls: "bg-emerald-100 text-emerald-800" },
  pagada: { label: "Pagada", cls: "bg-emerald-600 text-white" },
  rechazada: { label: "Rechazada", cls: "bg-line text-muted" },
  retirada: { label: "Retirada", cls: "bg-line text-muted" },
  vencida: { label: "Vencida", cls: "bg-line text-muted" },
};

export default async function OfertasClientesPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter = f === "pendiente" ? "pendiente" : f === "abiertas" ? "abiertas" : "todas";
  const [rows, buyers] = await Promise.all([listAllBuyerOffers(filter), listBuyersForAdmin()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Ofertas de compradores</h1>
        <p className="mt-2 text-sm text-muted">
          Lo que los compradores ofrecen desde su cuenta. Si aceptas, ellos pagan al precio acordado desde su cuenta (tienen 24 h). {buyers.count} cuentas creadas, {buyers.verified} con correo verificado.
        </p>
      </header>

      <nav aria-label="Filtrar" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {(
          [
            ["todas", "Todas"],
            ["pendiente", "Sin responder"],
            ["abiertas", "Abiertas"],
          ] as const
        ).map(([k, label]) => (
          <Link key={k} href={k === "todas" ? "/admin/ofertas-clientes" : `/admin/ofertas-clientes?f=${k}`} className={`rounded-full px-4 py-2 ${filter === k ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>Sin ofertas todavía.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => {
            const st = STATUS[o.status];
            const pct = Math.round((o.amount / o.listPrice) * 100);
            return (
              <li key={o.id} className={`${cardCls} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.brand ? `${o.brand} ` : ""}{o.productName}</p>
                    <p className="text-xs text-muted">
                      {o.size && o.size !== "Única" ? `Talla ${o.size} · ` : ""}
                      {o.buyerName || "Sin nombre"} · {o.buyerEmail}{o.buyerPhone ? ` · ${o.buyerPhone}` : ""} · {ago(o.createdAt)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                </div>
                <p className="mt-2 text-sm">
                  Oferta: <strong>{formatPrice(o.amount)}</strong> <span className="text-muted">({pct}% de {formatPrice(o.listPrice)})</span>
                  {o.status === "contraoferta" ? <> · Tu contraoferta: <strong>{formatPrice(o.counterAmount)}</strong></> : null}
                  {o.status === "aceptada" || o.status === "pagada" ? <> · Acordado: <strong>{formatPrice(o.agreedAmount)}</strong></> : null}
                  {o.orderRef ? <> · Pedido <Link href="/admin/pedidos" className="underline">{o.orderRef}</Link></> : null}
                </p>
                {o.responseNote && <p className="mt-1 text-sm text-muted">Nota: “{o.responseNote}”</p>}

                {o.status === "pendiente" && (
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    <form action={respondOffer} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={o.id} />
                      <button name="action" value="aceptar" className={btnAccent}>Aceptar {formatPrice(o.amount)}</button>
                    </form>
                    <form action={respondOffer} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={o.id} />
                      <input name="counter" inputMode="numeric" placeholder="Contraoferta, ej. 650000" className={`${inputCls} !w-48`} />
                      <input name="note" maxLength={300} placeholder="Nota para el comprador (opcional)" className={`${inputCls} !w-64`} />
                      <button name="action" value="contraoferta" className={btnGhost}>Contraofertar</button>
                      <button name="action" value="rechazar" className={btnGhost}>Rechazar</button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
