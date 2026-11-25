"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { linkPending } from "@/app/admin/catalogo/actions";
import { formatPrice } from "@/lib/format";
import { inputCls } from "@/components/reseller/ui";

export interface PendingModel {
  slug: string;
  brand: string;
  name: string;
  image: string;
}

/** Pares iguales de un mismo revendedor (mismo nombre, código y precio), con todas sus tallas. */
export interface PendingGroup {
  key: string;
  itemIds: number[];
  sellerId: number;
  sellerName: string;
  brand: string;
  title: string;
  sku: string;
  sizes: string[];
  price: number;
  reason: string;
  suggestions: PendingModel[];
}

const thumb = (src: string) => (src.startsWith("/products/") && !src.startsWith("/products/t/") ? src.replace("/products/", "/products/t/") : src);
const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

function ModelButton({ group, model }: { group: PendingGroup; model: PendingModel }) {
  const pairs = group.itemIds.length === 1 ? "este par" : `estos ${group.itemIds.length} pares`;
  return (
    <form
      action={linkPending}
      onSubmit={(e) => {
        if (!window.confirm(`¿"${group.title}" de ${group.sellerName} es "${model.name}"?\n\nSe enlaza${group.itemIds.length === 1 ? "" : "n"} ${pairs} a ese modelo y sale${group.itemIds.length === 1 ? "" : "n"} en la web al actualizar el catálogo.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="ids" value={group.itemIds.join(",")} />
      <input type="hidden" name="slug" value={model.slug} />
      <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-paper p-1.5 pr-3 text-left transition hover:border-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb(model.image)} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded bg-white object-contain" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium">{model.name}</span>
          <span className="block text-[11px] text-muted">{model.brand} · Es este</span>
        </span>
      </button>
    </form>
  );
}

function Row({ group, catalog }: { group: PendingGroup; catalog: PendingModel[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const found = useMemo(() => {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return catalog.filter((m) => tokens.every((t) => norm(`${m.brand} ${m.name}`).includes(t))).slice(0, 6);
  }, [q, catalog]);

  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-medium">
            {group.brand ? <span className="text-muted">{group.brand} · </span> : null}
            {group.title}
            {group.sizes.length > 0 ? ` · ${group.sizes.length === 1 ? "talla" : "tallas"} ${group.sizes.join(", ")}` : ""}
            {group.price ? ` · ${formatPrice(group.price)}` : ""}
          </p>
          <p className="text-xs text-muted">
            <Link href={`/admin/revendedores/${group.sellerId}`} className="underline">{group.sellerName}</Link>
            {group.itemIds.length > 1 ? ` · ${group.itemIds.length} pares` : ""}
            {group.sku ? ` · código ${group.sku}` : ""} · {group.reason}
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="shrink-0 text-xs font-semibold underline underline-offset-2">
          {open ? "Cerrar búsqueda" : "Buscar el modelo"}
        </button>
      </div>

      {group.suggestions.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">¿Es alguno de estos?</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.suggestions.map((m) => (
              <ModelButton key={m.slug} group={group} model={m} />
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="mt-3 rounded-lg border border-line bg-paper p-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Escribe el modelo como está en el catálogo (ej: dunk panda)" aria-label={`Buscar el modelo de ${group.title}`} className={inputCls} />
          {q.trim() && found.length === 0 && <p className="mt-2 text-xs text-muted">Ese modelo no está en el catálogo todavía: hace falta subirlo con su foto.</p>}
          {found.length > 0 && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {found.map((m) => (
                <ModelButton key={m.slug} group={group} model={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** "Por completar": cada referencia con los modelos del catálogo que se le parecen, para confirmarla con un clic. */
export default function PendingList({ groups, catalog }: { groups: PendingGroup[]; catalog: PendingModel[] }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {groups.map((g) => (
        <Row key={g.key} group={g} catalog={catalog} />
      ))}
    </ul>
  );
}
