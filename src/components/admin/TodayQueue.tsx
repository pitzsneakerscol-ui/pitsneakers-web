import Link from "next/link";
import { getTodayQueue } from "@/lib/today";
import { cardCls } from "@/components/reseller/ui";

/** "Hoy": lo que necesita atención del dueño, con enlace directo a cada cosa. Va al inicio del panel. */
export default async function TodayQueue() {
  const { sections, urgent, total } = await getTodayQueue();

  return (
    <section aria-labelledby="hoy-titulo" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="hoy-titulo" className="font-display text-3xl tracking-wide sm:text-4xl">Hoy</h2>
        <p className="text-sm text-muted">
          {total === 0 ? "Todo al día." : urgent > 0 ? <><strong className="text-accent">{urgent} urgente{urgent === 1 ? "" : "s"}</strong> · {total} en total</> : `${total} pendiente${total === 1 ? "" : "s"}, ninguno urgente.`}
        </p>
      </div>

      {sections.length === 0 ? (
        <div className={`${cardCls} px-6 py-10 text-center text-sm text-muted`}>
          No hay pedidos por despachar, ofertas por responder, cobros vencidos, consultas ni reseñas pendientes. 🎉
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((s) => (
            <article key={s.id} className={`${cardCls} p-4 sm:p-5 ${s.urgent ? "ring-1 ring-accent/60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl tracking-wide">
                  {s.title}{" "}
                  <span className={`ml-1 rounded-full px-2.5 py-0.5 align-middle text-xs font-bold ${s.urgent ? "bg-accent text-white" : "bg-line text-ink"}`}>{s.count}</span>
                </h3>
                <Link href={s.href} className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-accent hover:underline">{s.hrefLabel}</Link>
              </div>
              <ul className="mt-3 divide-y divide-line/70 text-sm">
                {s.items.map((it) => (
                  <li key={it.key} className="flex items-start justify-between gap-3 py-2.5">
                    <Link href={it.href} className="min-w-0 hover:underline">
                      <span className={`block truncate font-medium ${it.tone === "bad" ? "text-accent" : ""}`}>{it.title}</span>
                      <span className="block text-xs text-muted">{it.detail}</span>
                    </Link>
                    {it.whatsapp ? (
                      <a href={it.whatsapp} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:border-ink">
                        WhatsApp
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
              {s.count > s.items.length ? <p className="mt-2 text-xs text-muted">y {s.count - s.items.length} más…</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
