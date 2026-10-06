"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { formatPercent, type Item } from "@/lib/reseller-shared";
import { inputCls, labelCls } from "@/components/reseller/ui";

export interface CatalogEntry {
  slug: string;
  name: string;
  brand: string;
  colorway: string;
  image: string;
  price: number;
}

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(DIACRITICS, "");

const digits = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;

export default function ItemFields({
  mode,
  catalog,
  today,
  item,
}: {
  mode: "add" | "edit";
  catalog: CatalogEntry[];
  today: string;
  item?: Item;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [colorway, setColorway] = useState(item?.colorway ?? "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [slug, setSlug] = useState(item?.catalogSlug ?? "");
  const [cost, setCost] = useState(item ? String(item.cost) : "");
  const [extra, setExtra] = useState(item && item.extraCost ? String(item.extraCost) : "");
  const [expected, setExpected] = useState(
    item && item.expectedPrice ? String(item.expectedPrice) : ""
  );
  const [open, setOpen] = useState(false);

  const linked = useMemo(() => catalog.find((c) => c.slug === slug), [catalog, slug]);

  const matches = useMemo(() => {
    const tokens = norm(name).split(/\s+/).filter(Boolean);
    if (!open || name.trim().length < 2) return [];
    return catalog
      .filter((c) => {
        const hay = norm(`${c.brand} ${c.name} ${c.colorway}`);
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 8);
  }, [catalog, name, open]);

  const total = digits(cost) + digits(extra);
  const profit = digits(expected) > 0 ? digits(expected) - total : null;
  const margin = profit !== null && digits(expected) > 0 ? (profit / digits(expected)) * 100 : null;

  function pick(c: CatalogEntry) {
    setName(c.name);
    setBrand(c.brand);
    setColorway(c.colorway);
    setImageUrl(c.image);
    setSlug(c.slug);
    setOpen(false);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="catalogSlug" value={slug} />

      <div className="relative sm:col-span-2">
        <label htmlFor={`name-${item?.id ?? "new"}`} className={labelCls}>
          Par / modelo *
        </label>
        <input
          id={`name-${item?.id ?? "new"}`}
          name="name"
          required
          maxLength={120}
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setOpen(true);
            if (linked && e.target.value !== linked.name) setSlug("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Escribe para buscar en el catálogo de Pitsneakers…"
          className={inputCls}
        />
        {matches.length > 0 && (
          <ul className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-line bg-paper-raised shadow-lg">
            {matches.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-paper"
                >
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" className="h-10 w-10 shrink-0 rounded bg-[#ebe8e2] object-contain" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded bg-paper" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {c.brand}
                      {c.colorway ? ` · ${c.colorway}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{formatPrice(c.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {linked ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">
              Vinculado al catálogo
            </span>
            <span>
              Precio en Pitsneakers: <strong className="text-ink">{formatPrice(linked.price)}</strong>
            </span>
            <button
              type="button"
              onClick={() => setExpected(String(linked.price))}
              className="underline underline-offset-2 hover:text-ink"
            >
              Usar como precio esperado
            </button>
            <Link href={`/producto/${linked.slug}`} target="_blank" className="underline underline-offset-2 hover:text-ink">
              Ver ficha
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Si el par está en el catálogo, elígelo para traer marca, foto y precio de referencia. Si no, escríbelo libremente.
          </p>
        )}
      </div>

      <div>
        <label className={labelCls} htmlFor={`brand-${item?.id ?? "new"}`}>Marca</label>
        <input id={`brand-${item?.id ?? "new"}`} name="brand" maxLength={60} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Nike, Jordan, Adidas…" className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`cw-${item?.id ?? "new"}`}>Colorway</label>
        <input id={`cw-${item?.id ?? "new"}`} name="colorway" maxLength={80} value={colorway} onChange={(e) => setColorway(e.target.value)} placeholder="Panda, Bred…" className={inputCls} />
      </div>

      <div>
        <label className={labelCls} htmlFor={`sku-${item?.id ?? "new"}`}>Código de estilo (SKU)</label>
        <input id={`sku-${item?.id ?? "new"}`} name="sku" maxLength={40} defaultValue={item?.sku ?? ""} placeholder="DD1391-100" className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`cond-${item?.id ?? "new"}`}>Condición</label>
        <select id={`cond-${item?.id ?? "new"}`} name="condition" defaultValue={item?.condition ?? "nuevo"} className={inputCls}>
          <option value="nuevo">Nuevo</option>
          <option value="usado">Usado</option>
        </select>
      </div>

      {mode === "add" ? (
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="sizes-new">Talla(s) *</label>
          <input id="sizes-new" name="sizes" required maxLength={300} placeholder="9, 9.5, 10x2  (crea un par por talla; x2 = dos pares)" className={inputCls} />
          <p className="mt-1.5 text-xs text-muted">El costo y el precio se aplican a cada par.</p>
        </div>
      ) : (
        <div>
          <label className={labelCls} htmlFor={`size-${item?.id}`}>Talla *</label>
          <input id={`size-${item?.id}`} name="size" required maxLength={12} defaultValue={item?.size ?? ""} className={inputCls} />
        </div>
      )}

      <div>
        <label className={labelCls} htmlFor={`cost-${item?.id ?? "new"}`}>Cuánto pagaste (COP) *</label>
        <input id={`cost-${item?.id ?? "new"}`} name="cost" required inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="350000" className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`extra-${item?.id ?? "new"}`}>Costos extra (envío, importación…)</label>
        <input id={`extra-${item?.id ?? "new"}`} name="extraCost" inputMode="numeric" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="0" className={inputCls} />
      </div>
      <div className={mode === "add" ? "" : "sm:col-span-2"}>
        <label className={labelCls} htmlFor={`exp-${item?.id ?? "new"}`}>Precio esperado de venta (COP)</label>
        <input id={`exp-${item?.id ?? "new"}`} name="expectedPrice" inputMode="numeric" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="520000" className={inputCls} />
      </div>
      <div className="flex items-end">
        <div className="w-full rounded-lg bg-paper px-4 py-2.5 text-sm">
          {profit === null ? (
            <span className="text-muted">Escribe el precio esperado para ver tu utilidad.</span>
          ) : (
            <span>
              Utilidad esperada:{" "}
              <strong className={profit >= 0 ? "text-emerald-700" : "text-accent"}>{formatPrice(profit)}</strong>
              {margin !== null && <span className="text-muted"> · margen {formatPercent(margin)}</span>}
            </span>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor={`date-${item?.id ?? "new"}`}>Fecha de compra</label>
        <input id={`date-${item?.id ?? "new"}`} name="purchaseDate" type="date" max={today} defaultValue={item?.purchaseDate || today} className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor={`src-${item?.id ?? "new"}`}>Proveedor / dónde lo compraste</label>
        <input id={`src-${item?.id ?? "new"}`} name="source" maxLength={80} defaultValue={item?.source ?? ""} placeholder="Tienda, persona, país…" className={inputCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor={`img-${item?.id ?? "new"}`}>Foto (link opcional)</label>
        <input id={`img-${item?.id ?? "new"}`} name="imageUrl" maxLength={300} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className={inputCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor={`notes-${item?.id ?? "new"}`}>Notas</label>
        <textarea id={`notes-${item?.id ?? "new"}`} name="notes" maxLength={500} rows={2} defaultValue={item?.notes ?? ""} placeholder="Defectos, con caja, extra laces…" className={inputCls} />
      </div>
    </div>
  );
}
