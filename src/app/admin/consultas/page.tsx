import type { Metadata } from "next";
import Link from "next/link";
import { listAllQuestions } from "@/lib/market";
import { verdictLabel } from "@/lib/market-emails";
import { formatPrice } from "@/lib/format";
import { ago } from "@/lib/admin-shared";
import { cardCls } from "@/components/reseller/ui";
import AnswerForm from "@/components/admin/AnswerForm";

export const metadata: Metadata = { title: "Consultas de mercado" };

export default async function ConsultasAdminPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter = f === "respondida" ? "respondida" : f === "todas" ? "todas" : "pendiente";
  const rows = await listAllQuestions(filter);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Consultas de mercado</h1>
        <p className="mt-2 text-sm text-muted">Los revendedores preguntan si les recomiendas comprar un par. Tu respuesta les llega al panel, a la campana y por correo.</p>
      </header>

      <nav aria-label="Filtrar" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {(
          [
            ["pendiente", "Pendientes"],
            ["respondida", "Respondidas"],
            ["todas", "Todas"],
          ] as const
        ).map(([k, label]) => (
          <Link key={k} href={k === "pendiente" ? "/admin/consultas" : `/admin/consultas?f=${k}`} className={`rounded-full px-4 py-2 ${filter === k ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="font-display text-2xl tracking-wide">{filter === "pendiente" ? "No hay consultas pendientes" : "Sin consultas"}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Cuando un revendedor pregunte por un par, aparece aquí y también te llega a info@pitsneakers.com.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((q) => (
            <li key={q.id} className={`${cardCls} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{q.model}</p>
                  <p className="text-xs text-muted">
                    {q.size ? `Talla ${q.size} · ` : ""}
                    {q.buyPrice > 0 ? `Lo compraría a ${formatPrice(q.buyPrice)} · ` : ""}
                    {ago(q.createdAt)} ·{" "}
                    <Link href={`/admin/revendedores/${q.userId}`} className="underline">{q.sellerName}</Link>
                    {q.sellerEmail ? ` · ${q.sellerEmail}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${q.status === "pendiente" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {q.status === "pendiente" ? "Pendiente" : verdictLabel(q.verdict)}
                </span>
              </div>
              {q.note && <p className="mt-2 text-sm text-muted">“{q.note}”</p>}
              <AnswerForm id={q.id} verdict={q.verdict} answer={q.answer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
