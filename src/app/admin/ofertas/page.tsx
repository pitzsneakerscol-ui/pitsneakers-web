import type { Metadata } from "next";
import Link from "next/link";
import { listAllOffers, type OfferStatus } from "@/lib/offers";
import { formatPrice } from "@/lib/format";
import { ago } from "@/lib/admin-shared";
import { cardCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Ofertas" };

const STATUS: Record<OfferStatus, { label: string; cls: string }> = {
  pendiente: { label: "Sin responder", cls: "bg-amber-100 text-amber-800" },
  aceptada: { label: "Aceptada", cls: "bg-emerald-100 text-emerald-800" },
  rechazada: { label: "Rechazada", cls: "bg-line text-muted" },
  contraoferta: { label: "Contraoferta", cls: "bg-accent/10 text-accent" },
};

export default async function OfertasAdminPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter = f === "pendiente" ? "pendiente" : f === "respondidas" ? "respondidas" : "todas";
  const rows = await listAllOffers(filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Ofertas</h1>
        <p className="mt-2 text-sm text-muted">Las ofertas que avisaste a tus vendedores y lo que respondieron. Para crear una, entra al vendedor y pulsa “Avisar oferta” en su par.</p>
      </header>

      <nav aria-label="Filtrar" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {(
          [
            ["todas", "Todas"],
            ["pendiente", "Sin responder"],
            ["respondidas", "Respondidas"],
          ] as const
        ).map(([k, label]) => (
          <Link key={k} href={k === "todas" ? "/admin/ofertas" : `/admin/ofertas?f=${k}`} className={`rounded-full px-4 py-2 ${filter === k ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
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
            return (
              <li key={o.id} className={`${cardCls} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.itemName}</p>
                    <p className="text-xs text-muted">
                      {o.size ? `Talla ${o.size} · ` : ""}
                      <Link href={`/admin/revendedores/${o.userId}`} className="underline">{o.sellerName}</Link> · {ago(o.createdAt)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                </div>
                <p className="mt-2 text-sm">
                  Oferta: <strong>{formatPrice(o.amount)}</strong>
                  {o.status === "contraoferta" ? <> · Contraoferta del vendedor: <strong>{formatPrice(o.counterAmount)}</strong></> : null}
                </p>
                {(o.responseNote || o.note) && <p className="mt-1 text-sm text-muted">{o.responseNote ? `Vendedor: “${o.responseNote}”` : `Tu nota: “${o.note}”`}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
