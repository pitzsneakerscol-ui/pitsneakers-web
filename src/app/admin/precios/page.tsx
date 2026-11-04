import type { Metadata } from "next";
import Link from "next/link";
import { getStaticProducts } from "@/lib/products";
import { loadLiveOverlay } from "@/lib/catalog-live";
import { formatPrice } from "@/lib/format";
import { btnGhost, btnPrimary, cardCls, inputCls, selectAutoCls } from "@/components/reseller/ui";
import { resetPrice, savePrice } from "./actions";

export const metadata: Metadata = { title: "Catálogo y precios" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
/** 1250000 → "1.250.000" (se lee mejor; al guardar se aceptan con o sin puntos). */
const grouped = (n: number) => n.toLocaleString("es-CO");
const loose = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** Miniatura liviana si existe (las fotos del catálogo tienen una versión de 640 px); si no, la foto tal cual. */
const thumb = (src: string) => (src.startsWith("/products/") && !src.startsWith("/products/t/") ? src.replace("/products/", "/products/t/") : src);

export default async function PreciosPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; pag?: string; ok?: string; err?: string }> }) {
  const { q = "", f = "todos", pag = "1", ok = "", err = "" } = await searchParams;
  const [statics, overlay] = await Promise.all([getStaticProducts(), loadLiveOverlay()]);

  // Los SKU que la sincronización oculta (el revendedor ya no los tiene) no están a la venta: no se listan.
  const base = [...statics.filter((p) => !overlay.hidden.has(p.id)), ...overlay.live];
  const liveIds = new Set(overlay.live.map((p) => p.id));
  const query = loose(q.trim().slice(0, 60));
  const filtered = base
    .filter((p) => {
      const o = overlay.overrides.get(p.id);
      if (f === "ajustados" && !o) return false;
      if (f === "ocultos" && !o?.hidden) return false;
      if (f === "sneakers" && p.category !== "sneakers") return false;
      if (f === "ropa" && p.category !== "streetwear") return false;
      return !query || loose(`${p.id} ${p.brand} ${p.name} ${p.colorway ?? ""}`).includes(query);
    })
    .sort((a, b) => `${a.brand} ${a.name} ${a.id}`.localeCompare(`${b.brand} ${b.name} ${b.id}`, "es"));

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(pag) || 1));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const adjusted = overlay.overrides.size;

  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (f !== "todos") p.set("f", f);
    for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
    const s = p.toString();
    return `/admin/precios${s ? `?${s}` : ""}`;
  };
  const here = qs(page > 1 ? { pag: page } : {});

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Catálogo y precios</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Cambia el precio de un par, pon un “precio antes” para mostrarlo en promo, u ocúltalo si ya se vendió. El cambio se ve al instante en la página, en el pago, las ofertas y la subasta. No hace falta tocar el código.
        </p>
      </header>

      <form method="get" className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por modelo, marca o SKU…" className={inputCls} />
        </div>
        <select name="f" defaultValue={f} aria-label="Mostrar" className={selectAutoCls}>
          <option value="todos">Todos</option>
          <option value="sneakers">Sneakers</option>
          <option value="ropa">Ropa y accesorios</option>
          <option value="ajustados">Con ajuste manual ({adjusted})</option>
          <option value="ocultos">Ocultos</option>
        </select>
        <button type="submit" className={btnPrimary}>Filtrar</button>
        <Link href="/admin/precios" className={btnGhost}>Limpiar</Link>
      </form>

      <p className="text-xs text-muted">
        {filtered.length} par{filtered.length === 1 ? "" : "es"} · página {page} de {pages}
      </p>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>No hay pares con ese filtro.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const o = overlay.overrides.get(p.id);
            const filePrice = p.price;
            const price = o?.price ?? p.price;
            const before = o ? o.priceBefore : p.priceBefore && p.priceBefore > p.price ? p.priceBefore : 0;
            const photo = p.images[0];
            return (
              <li key={p.id} id={`p-${p.id}`} className={`${cardCls} scroll-mt-24 p-4 ${ok === p.id ? "ring-2 ring-emerald-500/60" : ""}`}>
                <form action={savePrice} className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <input type="hidden" name="sku" value={p.id} />
                  <input type="hidden" name="back" value={here} />

                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {photo ? (
                      // Miniatura estática del catálogo: no pasa por el optimizador de imágenes.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb(photo)} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg border border-line bg-white object-contain" />
                    ) : (
                      <span className="h-16 w-16 shrink-0 rounded-lg border border-dashed border-line" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.brand} {p.name}</p>
                      <p className="text-xs text-muted">
                        {p.id} · talla {(o?.sizes ?? p.sizes).join(", ") || "—"} · {p.condition}
                        {liveIds.has(p.id) && " · del stock de un revendedor"}
                      </p>
                      {o && (
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                          Ajustado a mano · original {formatPrice(filePrice)}
                          {o.hidden && " · oculto"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
                    <div>
                      <label htmlFor={`pr-${p.id}`} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Precio</label>
                      <input id={`pr-${p.id}`} name="price" inputMode="numeric" defaultValue={grouped(price)} required className={`${inputCls} sm:w-36`} />
                    </div>
                    <div>
                      <label htmlFor={`pb-${p.id}`} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Precio antes</label>
                      <input id={`pb-${p.id}`} name="priceBefore" inputMode="numeric" defaultValue={before ? grouped(before) : ""} placeholder="Sin promo" className={`${inputCls} sm:w-36`} />
                    </div>
                    <label className="col-span-2 flex items-center gap-2 pb-2.5 text-sm sm:col-span-1">
                      <input type="checkbox" name="hidden" defaultChecked={o?.hidden} className="h-4 w-4 accent-[var(--color-accent)]" />
                      Ocultar
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className={btnPrimary}>Guardar</button>
                    {o && (
                      <button type="submit" formAction={resetPrice} formNoValidate className={btnGhost}>
                        Volver al original
                      </button>
                    )}
                  </div>
                </form>
                {err === p.id && <p role="alert" className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">No se guardó: escribe un precio entre $1.000 y $99.999.999.</p>}
                {ok === p.id && <p role="status" className="mt-3 text-sm text-emerald-700">Guardado. Ya se ve en la página.</p>}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Páginas">
          {page > 1 ? <Link href={qs({ pag: page - 1 })} className={btnGhost}>← Anterior</Link> : <span />}
          <span className="text-muted">Página {page} de {pages}</span>
          {page < pages ? <Link href={qs({ pag: page + 1 })} className={btnGhost}>Siguiente →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
