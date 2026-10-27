import type { Metadata } from "next";
import Link from "next/link";
import { computeCatalogPlan, getCatalogState } from "@/lib/catalog-sync";
import { serverNow } from "@/lib/auction";
import { ago } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { btnPrimary, cardCls } from "@/components/reseller/ui";
import { refreshCatalog } from "@/app/admin/catalogo/actions";

export const metadata: Metadata = { title: "Actualizar catálogo" };
export const dynamic = "force-dynamic";

export default async function CatalogSyncPage({ searchParams }: { searchParams: Promise<{ listo?: string }> }) {
  const { listo } = await searchParams;
  const now = serverNow();
  const [plan, state] = await Promise.all([computeCatalogPlan(now), getCatalogState()]);

  const toAdd = plan.live.filter((l) => !state.live.has(l.product.id));
  const toRemoveLive = [...state.live].filter(([id]) => !plan.live.some((l) => l.product.id === id));
  const toHide = plan.hidden.filter((h) => !state.hidden.has(h.sku));
  const toShow = [...state.hidden].filter((sku) => !plan.hidden.some((h) => h.sku === sku));
  const changes = toAdd.length + toRemoveLive.length + toHide.length + toShow.length;
  const [a, h, p] = (listo ?? "").split("-").map(Number);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Actualizar catálogo</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Deja la página igual al stock de los revendedores: publica los pares que cargaron (con modelo, foto y precio) y quita los que ya vendieron. Los pares sin foto o sin modelo quedan abajo para que los completes tú. Los pares reservados no se muestran.
        </p>
      </header>

      {listo && !Number.isNaN(a) && (
        <p role="status" className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">
          Catálogo actualizado: {a} par{a === 1 ? "" : "es"} en vivo, {h} oculto{h === 1 ? "" : "s"}, {p} por completar. La web ya muestra el cambio.
        </p>
      )}

      <section className={`${cardCls} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-2xl tracking-wide">{changes === 0 ? "Todo al día" : `${changes} cambio${changes === 1 ? "" : "s"} por aplicar`}</p>
            <p className="text-sm text-muted">Última actualización: {state.updatedAt ? ago(state.updatedAt) : "nunca"} · {state.live.size} en vivo · {state.hidden.size} ocultos</p>
          </div>
          <form action={refreshCatalog}>
            <button type="submit" className={btnPrimary}>Actualizar catálogo</button>
          </form>
        </div>

        {changes > 0 && (
          <div className="mt-5 grid gap-6 border-t border-line pt-5 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Se publicarán ({toAdd.length})</h2>
              {toAdd.length === 0 ? <p className="text-sm text-muted">Ninguno.</p> : (
                <ul className="space-y-1 text-sm">
                  {toAdd.map((l) => (
                    <li key={l.product.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{l.product.name} · {l.product.sizes.join(", ")} <span className="text-muted">({l.sellerName})</span></span>
                      <span className="shrink-0 tabular-nums">{formatPrice(l.product.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Se quitarán ({toRemoveLive.length + toHide.length})</h2>
              {toRemoveLive.length + toHide.length === 0 ? <p className="text-sm text-muted">Ninguno.</p> : (
                <ul className="space-y-1 text-sm">
                  {toHide.map((x) => (
                    <li key={x.sku} className="truncate">{x.name} · {x.size} <span className="text-muted">({x.sellerName}, ya sin stock)</span></li>
                  ))}
                  {toRemoveLive.map(([id, x]) => (
                    <li key={id} className="truncate">{x.name} · {x.size} <span className="text-muted">(ya no está en stock)</span></li>
                  ))}
                </ul>
              )}
              {toShow.length > 0 && <p className="mt-3 text-xs text-muted">{toShow.length} par{toShow.length === 1 ? "" : "es"} oculto{toShow.length === 1 ? "" : "s"} volverá{toShow.length === 1 ? "" : "n"} a mostrarse (el revendedor lo(s) tiene de nuevo en stock).</p>}
            </div>
          </div>
        )}
      </section>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Por completar ({plan.pending.length})</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Están en stock del revendedor pero no se pueden publicar solos. Mándame la foto (o el modelo) y los cargo; al actualizar, salen en la web.</p>
        {plan.pending.length === 0 ? (
          <p className="rounded-lg bg-paper px-4 py-3 text-sm text-muted">No hay nada pendiente.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {plan.pending.map((x) => (
              <li key={x.itemId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{x.name}{x.size ? ` · ${x.size}` : ""}{x.price ? ` · ${formatPrice(x.price)}` : ""}</p>
                  <p className="text-xs text-muted">
                    <Link href={`/admin/revendedores/${x.sellerId}`} className="underline">{x.sellerName}</Link> · {x.reason}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
