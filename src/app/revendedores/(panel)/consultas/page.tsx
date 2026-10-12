import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listQuestions } from "@/lib/market";
import { verdictLabel } from "@/lib/market-emails";
import { formatPrice } from "@/lib/format";
import { fmtDay } from "@/lib/admin-shared";
import { getCatalogEntries } from "@/lib/reseller-catalog";
import { cardCls } from "@/components/reseller/ui";
import ConsultaForm from "@/components/reseller/ConsultaForm";

export const metadata: Metadata = { title: "Pregunta al mercado" };

const VERDICT_STYLE: Record<string, string> = {
  comprar: "bg-emerald-100 text-emerald-800",
  esperar: "bg-amber-100 text-amber-800",
  no: "bg-accent/10 text-accent",
};

export default async function ConsultasPage() {
  const user = await requireUser();
  const [questions, catalog] = await Promise.all([listQuestions(user.id), getCatalogEntries()]);
  const suggestions = catalog.map((c) => `${c.brand} ${c.name}`.replace(/^(\S+) \1 /, "$1 ")).slice(0, 400);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">¿Compro este par o no?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Pregúntale al equipo de Pitsneakers cómo se está moviendo un par en el mercado antes de comprarlo. Te damos una opinión
          sincera: comprar, esperar o dejarlo pasar.
        </p>
      </header>

      <ConsultaForm suggestions={suggestions} />

      <section aria-labelledby="mis-consultas" className="space-y-3">
        <h2 id="mis-consultas" className="font-display text-2xl tracking-wide">Mis consultas</h2>
        {questions.length === 0 ? (
          <div className={`${cardCls} px-6 py-10 text-center text-sm text-muted`}>Aún no has hecho consultas. Pregunta por el primer par que te interese.</div>
        ) : (
          <ul className="space-y-3">
            {questions.map((q) => (
              <li key={q.id} className={`${cardCls} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{q.model}</p>
                    <p className="text-xs text-muted">
                      {q.size ? `Talla ${q.size} · ` : ""}
                      {q.buyPrice > 0 ? `Lo comprarías a ${formatPrice(q.buyPrice)} · ` : ""}
                      {fmtDay(q.createdAt)}
                    </p>
                  </div>
                  {q.status === "respondida" ? (
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${VERDICT_STYLE[q.verdict] ?? "bg-line text-ink"}`}>
                      {verdictLabel(q.verdict)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-line px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">En revisión…</span>
                  )}
                </div>
                {q.note && <p className="mt-2 text-sm text-muted">“{q.note}”</p>}
                {q.status === "respondida" && q.answer && (
                  <div className="mt-3 rounded-lg border-l-4 border-accent bg-paper px-4 py-3 text-sm leading-relaxed">
                    <p className="whitespace-pre-line">{q.answer}</p>
                    <p className="mt-2 text-xs text-muted">Equipo Pitsneakers{q.answeredAt ? ` · ${fmtDay(q.answeredAt)}` : ""}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
