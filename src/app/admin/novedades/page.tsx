import type { Metadata } from "next";
import Link from "next/link";
import { getStockNews, type NewsItem } from "@/lib/stock-news";
import { ago, waLink, waNumber } from "@/lib/admin-shared";
import { serverNow } from "@/lib/auction";
import { btnGhost, btnPrimary, cardCls, selectAutoCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Novedades de inventario" };
export const dynamic = "force-dynamic";

const RANGES = [1, 3, 7, 14, 30];

const label = (i: { name: string; brand: string; size: string }) => `${i.brand ? `${i.brand} ` : ""}${i.name}${i.size ? ` · ${i.size}` : ""}`;

function List({ items, empty }: { items: NewsItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {items.slice(0, 40).map((i, k) => (
        <li key={k} className="flex justify-between gap-3">
          <span className="min-w-0 truncate">{label(i)}</span>
          <span className="shrink-0 text-xs text-muted">{ago(i.createdAt)}</span>
        </li>
      ))}
      {items.length > 40 && <li className="text-xs text-muted">…y {items.length - 40} más</li>}
    </ul>
  );
}

export default async function StockNewsPage({ searchParams }: { searchParams: Promise<{ dias?: string; solo?: string }> }) {
  const { dias, solo } = await searchParams;
  const days = RANGES.includes(Number(dias)) ? Number(dias) : 7;
  const onlyNews = solo === "1";
  const rows = await getStockNews(days, serverNow());
  const shown = onlyNews ? rows.filter((r) => r.recent.length > 0) : rows;

  const updated = rows.filter((r) => r.recent.length > 0).length;
  const fresh = rows.reduce((s, r) => s + r.recent.length, 0);
  const toLoad = rows.reduce((s, r) => s + r.pendingLoad.length, 0);
  const toPublish = rows.reduce((s, r) => s + r.unpublished.length, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Novedades de inventario</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Quién actualizó su stock, qué es lo nuevo y qué falta: lo que tienen asignado en el catálogo y aún no cargaron, y lo que cargaron y todavía no está publicado en el catálogo.
        </p>
      </header>

      <form method="get" className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Novedad de los últimos</span>
          <select name="dias" defaultValue={String(days)} className={selectAutoCls}>
            {RANGES.map((d) => (
              <option key={d} value={d}>{d === 1 ? "1 día" : `${d} días`}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="solo" value="1" defaultChecked={onlyNews} className="h-4 w-4 accent-[var(--color-accent)]" />
          Solo los que actualizaron
        </label>
        <button type="submit" className={btnPrimary}>Ver</button>
        <Link href="/admin/novedades" className={btnGhost}>Limpiar</Link>
      </form>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Actualizaron", `${updated} de ${rows.length}`],
          ["Pares nuevos", String(fresh)],
          ["Faltan por cargar", String(toLoad)],
          ["Faltan por publicar", String(toPublish)],
        ].map(([k, v]) => (
          <div key={k} className={`${cardCls} px-4 py-3`}>
            <dd className="font-display text-3xl tabular-nums tracking-wide">{v}</dd>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{k}</dt>
          </div>
        ))}
      </dl>

      {shown.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>Nadie cargó pares en los últimos {days} días.</div>
      ) : (
        <div className="space-y-4">
          {shown.map((r) => {
            const msg = `Hola ${r.name}! Te faltan por cargar en la plataforma ${r.pendingLoad.length} par${r.pendingLoad.length === 1 ? "" : "es"}: ${r.pendingLoad.slice(0, 6).map((p) => `${p.name}${p.size ? ` (${p.size})` : ""}`).join(", ")}${r.pendingLoad.length > 6 ? "…" : ""}. ¿Los subes?`;
            return (
              <details key={r.userId} open={r.recent.length > 0 || r.pendingLoad.length > 0} className={`${cardCls} p-4 sm:p-5`}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <Link href={`/admin/revendedores/${r.userId}`} className="hover:underline">{r.name}</Link>
                      <span className="ml-2 text-xs font-normal text-muted">@{r.username}</span>
                    </p>
                    <p className="text-xs text-muted">
                      Última carga: {ago(r.lastUpdate)} · {r.active} par{r.active === 1 ? "" : "es"} activo{r.active === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
                    <span className={`rounded-full px-2.5 py-1 ${r.recent.length ? "bg-emerald-100 text-emerald-800" : "bg-paper text-muted"}`}>{r.recent.length} nuevos</span>
                    <span className={`rounded-full px-2.5 py-1 ${r.pendingLoad.length ? "bg-amber-100 text-amber-800" : "bg-paper text-muted"}`}>{r.pendingLoad.length} por cargar</span>
                    <span className={`rounded-full px-2.5 py-1 ${r.unpublished.length ? "bg-sky-100 text-sky-800" : "bg-paper text-muted"}`}>{r.unpublished.length} por publicar</span>
                  </div>
                </summary>

                <div className="mt-4 grid gap-6 border-t border-line pt-4 md:grid-cols-3">
                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Novedad ({days} d)</h3>
                    <List items={r.recent} empty="No cargó pares en este periodo." />
                  </section>
                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Falta cargar en su inventario</h3>
                    {r.pendingLoad.length === 0 ? (
                      <p className="text-sm text-muted">Tiene cargado todo lo que le asignaste.</p>
                    ) : (
                      <>
                        <ul className="space-y-1 text-sm">
                          {r.pendingLoad.slice(0, 40).map((p, k) => (
                            <li key={k} className="truncate">{p.name}{p.size ? ` · ${p.size}` : ""}</li>
                          ))}
                          {r.pendingLoad.length > 40 && <li className="text-xs text-muted">…y {r.pendingLoad.length - 40} más</li>}
                        </ul>
                        {r.whatsapp && (
                          <a href={waLink(waNumber(r.whatsapp), msg)} target="_blank" rel="noopener noreferrer" className={`${btnGhost} mt-3`}>
                            Avisarle por WhatsApp
                          </a>
                        )}
                      </>
                    )}
                  </section>
                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Falta publicar en el catálogo</h3>
                    <List items={r.unpublished} empty="Todo lo suyo ya está enlazado al catálogo." />
                  </section>
                </div>
              </details>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted">
        “Actualizó” se mide por la fecha en que cargó cada par; si solo cambia un precio o una talla, no cuenta como novedad.
      </p>
    </div>
  );
}
