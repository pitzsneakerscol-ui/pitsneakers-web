import type { Metadata } from "next";
import { computeCatalogPlan, getCatalogState } from "@/lib/catalog-sync";
import { catalogIndex } from "@/lib/catalog-index";
import { fullTitle } from "@/lib/catalog-match";
import { getSyncProducts } from "@/lib/catalog-models";
import { serverNow } from "@/lib/auction";
import { ago } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { btnPrimary, cardCls } from "@/components/reseller/ui";
import { fixInventories, refreshCatalog } from "@/app/admin/catalogo/actions";
import ConfirmForm from "@/components/admin/ConfirmForm";
import PendingList, { type PendingGroup, type PendingModel } from "@/components/admin/PendingList";

export const metadata: Metadata = { title: "Actualizar catálogo" };
export const dynamic = "force-dynamic";

const sizeNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isNaN(n) ? 999 : n;
};

export default async function CatalogSyncPage({ searchParams }: { searchParams: Promise<{ listo?: string; enlazados?: string; nuevo?: string; corregidos?: string; error?: string }> }) {
  const { listo, enlazados, nuevo, corregidos, error } = await searchParams;
  const now = serverNow();
  const [plan, state, statics] = await Promise.all([computeCatalogPlan(now), getCatalogState(), getSyncProducts()]);

  // Por completar: los pares iguales de un revendedor (mismo nombre, código y precio) van en una sola fila con todas sus tallas.
  const pendingGroups = new Map<string, PendingGroup>();
  for (const x of plan.pending) {
    const title = fullTitle(x.name, x.colorway);
    const key = [x.sellerId, x.brand, title, x.sku, x.price, x.reason].join("|").toLowerCase();
    const g = pendingGroups.get(key) ?? { key, itemIds: [], sellerId: x.sellerId, sellerName: x.sellerName, brand: x.brand, title, sku: x.sku, sizes: [], price: x.price, reason: x.reason, suggestions: x.suggestions };
    g.itemIds.push(x.itemId);
    if (x.size.trim()) g.sizes.push(x.size.trim());
    pendingGroups.set(key, g);
  }
  const groups = [...pendingGroups.values()].map((g) => ({ ...g, sizes: g.sizes.sort((a, b) => sizeNum(a) - sizeNum(b)) }));
  const withSuggestion = groups.filter((g) => g.suggestions.length > 0).length;
  // Modelos con foto, para buscar a mano el de una fila.
  const models: PendingModel[] = catalogIndex(statics)
    .groups.map((g) => ({ slug: g.groupSlug, brand: g.brand, name: fullTitle(g.name, g.colorway), image: g.images.find((u) => u.startsWith("/products/")) ?? "" }))
    .filter((m) => m.image);
  const fixes = plan.duplicates.length + plan.relinks.length;
  // Por qué sale de "en vivo" un par: lo vendieron, o el catálogo ya lo muestra a nombre de su revendedor y estaba dos veces.
  const coveredLive = new Set([...plan.covered, ...plan.duplicates.flatMap((d) => [d.handId, d.autoId])].map((id) => `LIVE-${id}`));
  const [merged, relinked] = (corregidos ?? "").split("-").map(Number);

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

      {enlazados !== undefined && (
        <p role="status" className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">
          {Number(enlazados) > 0
            ? `Listo: ${nuevo === "1" ? "el modelo quedó creado con su foto y " : ""}${enlazados} par${enlazados === "1" ? " quedó enlazado" : "es quedaron enlazados"} a su modelo. Pulsa Actualizar catálogo para que la web lo muestre.`
            : "Ese par ya no estaba por completar: no se cambió nada."}
        </p>
      )}
      {corregidos !== undefined && !Number.isNaN(merged) && (
        <p role="status" className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">
          Inventarios corregidos: {merged} duplicado{merged === 1 ? "" : "s"} unido{merged === 1 ? "" : "s"} y {relinked} par{relinked === 1 ? "" : "es"} con el modelo corregido.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800">
          {error === "datos" ? "Faltó la marca, el nombre o la foto del modelo. Vuelve a intentarlo." : error === "foto" ? "Esa foto ya no está: súbela de nuevo." : "No se pudo enlazar: ese modelo ya no está en el catálogo. Vuelve a intentarlo."}
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
                    <li key={id} className="truncate">{x.name} · {x.size} <span className="text-muted">({coveredLive.has(id) ? "estaba dos veces: sigue publicado con su revendedor" : "ya no está en stock"})</span></li>
                  ))}
                </ul>
              )}
              {toShow.length > 0 && <p className="mt-3 text-xs text-muted">{toShow.length} par{toShow.length === 1 ? "" : "es"} oculto{toShow.length === 1 ? "" : "s"} volverá{toShow.length === 1 ? "" : "n"} a mostrarse (el revendedor lo(s) tiene de nuevo en stock).</p>}
            </div>
          </div>
        )}
      </section>

      {fixes > 0 && (
        <section className={`${cardCls} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl tracking-wide">Inventarios por corregir ({fixes})</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                En el inventario de algunos revendedores hay pares repetidos o enlazados a un modelo que no es el suyo. La web ya no los cuenta dos veces; al corregirlos, cada par queda con un solo registro (el que cargó el revendedor, con su costo) y con su modelo.
              </p>
            </div>
            <ConfirmForm
              action={fixInventories}
              fields={{}}
              label={`Corregir ${fixes} registro${fixes === 1 ? "" : "s"}`}
              confirm={`Se borran ${plan.duplicates.length} registro${plan.duplicates.length === 1 ? "" : "s"} repetido${plan.duplicates.length === 1 ? "" : "s"} (los que cargó la plataforma, no los del revendedor) y se corrige el modelo de ${plan.relinks.length}. Los registros borrados no se pueden recuperar. ¿Continuar?`}
              className={btnPrimary}
            />
          </div>
          <details className="mt-4 border-t border-line pt-4 text-sm">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted">Ver el detalle</summary>
            <ul className="mt-3 space-y-1.5">
              {plan.duplicates.map((d) => (
                <li key={`d${d.autoId}`}>
                  <span className="text-muted">{d.sellerName} · </span>
                  {d.model} · talla {d.size || "—"}: está dos veces (a mano como “{d.typed}” y cargado por la plataforma). Se deja el del revendedor.
                </li>
              ))}
              {plan.relinks.map((r) => (
                <li key={`r${r.itemId}`}>
                  <span className="text-muted">{r.sellerName} · </span>
                  “{r.typed}” · talla {r.size || "—"}: está enlazado a {r.from} {r.to ? `y es ${r.to}.` : "y no es ese modelo: queda por completar hasta que tenga el suyo."}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Por completar ({plan.pending.length})</h2>
        <p className="mb-4 mt-1 max-w-2xl text-sm text-muted">
          Están en stock del revendedor pero no se pueden publicar solos.
          {withSuggestion > 0
            ? ` ${withSuggestion} referencia${withSuggestion === 1 ? " se parece" : "s se parecen"} a un modelo que ya está en el catálogo: confírmalo con un clic y sale${withSuggestion === 1 ? "" : "n"} al actualizar.`
            : ""}{" "}
          Si el modelo no está, súbele la foto aquí mismo: la preparo y creo el modelo.
        </p>
        {groups.length === 0 ? <p className="rounded-lg bg-paper px-4 py-3 text-sm text-muted">No hay nada pendiente.</p> : <PendingList groups={groups} catalog={models} />}
      </section>
    </div>
  );
}
