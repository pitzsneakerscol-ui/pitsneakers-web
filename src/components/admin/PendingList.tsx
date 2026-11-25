"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { createModelFromPhoto, flipModelPhoto, linkPending, uploadModelPhoto, type PhotoResult } from "@/app/admin/catalogo/actions";
import { formatPrice } from "@/lib/format";
import { shrinkImage } from "@/lib/shrink-image";
import { btnGhost, btnPrimary, inputCls, labelCls, selectAutoCls } from "@/components/reseller/ui";

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

/** "jordan 1 low OG bordeaux" → "Jordan 1 Low OG Bordeaux": mayúscula inicial, sin tocar siglas ni códigos. */
const tidyName = (v: string) =>
  v
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (/^[a-záéíóúñ]/.test(w) && w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

/** La marca como la lleva el catálogo: los Jordan van en "Jordan" y los Yeezy en "Adidas", aunque el revendedor ponga otra. */
function tidyBrand(brand: string, title: string): string {
  const t = norm(title);
  if (/^(air )?jordan\b/.test(t) || /^jumpman\b/.test(t)) return "Jordan";
  if (/^(yeezy|yzy)\b/.test(t) || norm(brand) === "yeezy") return "Adidas";
  return tidyName(brand);
}

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

/** Sube la foto del modelo que falta, la muestra ya preparada y crea el modelo con ella. */
function PhotoUpload({ group }: { group: PendingGroup }) {
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Extract<PhotoResult, { ok: true }> | null>(null);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("tenis");
  const [busy, start] = useTransition();
  const startTitle = group.brand && norm(group.title).startsWith(norm(group.brand) + " ") ? group.title.slice(group.brand.length + 1) : group.title;

  const send = (file: File) =>
    start(async () => {
      setError("");
      // Se reduce en el navegador: las fotos del celular pesan varios megas y el producto no necesita más de 2000 px.
      const small = await shrinkImage(file, 2000, 0.92);
      if (!small) {
        setError("No se pudo leer esa foto. Prueba con otra (JPG, PNG o WebP).");
        return;
      }
      const fd = new FormData();
      fd.set("photo", new File([small], "foto.jpg", { type: "image/jpeg" }));
      fd.set("kind", kind);
      const res = await uploadModelPhoto(fd);
      if (res.ok) setPhoto(res);
      else setError(res.error);
    });

  const flip = () =>
    start(async () => {
      if (!photo) return;
      const res = await flipModelPhoto(photo.name);
      if (res.ok) setPhoto({ ...photo, name: res.name, facing: "derecha" });
      else setError(res.error);
    });

  return (
    <div className="mt-3 rounded-lg border border-line bg-paper p-3">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) send(f);
        }}
      />
      {!photo ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className={btnGhost}>
            {busy ? "Preparando la foto…" : "Elegir la foto"}
          </button>
          <p className="min-w-0 flex-1 text-xs text-muted">Una foto de perfil del par, mejor con fondo blanco. Le quito el fondo, la dejo del tamaño de las demás y con la punta hacia la derecha.</p>
        </div>
      ) : (
        <form action={createModelFromPhoto} className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <input type="hidden" name="ids" value={group.itemIds.join(",")} />
          <input type="hidden" name="photo" value={photo.name} />
          <input type="hidden" name="code" value={group.sku} />
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/products/${photo.name}`} alt={`Foto preparada de ${group.title}`} className="aspect-square w-full rounded-lg border border-line bg-paper-raised object-contain" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={flip} disabled={busy} className={`${btnGhost} !px-3 !py-1.5`}>
                {busy ? "Un momento…" : "Voltear"}
              </button>
              <button type="button" onClick={() => input.current?.click()} disabled={busy} className={`${btnGhost} !px-3 !py-1.5`}>
                Otra foto
              </button>
            </div>
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-xs text-muted">
              {photo.facing === "dudosa"
                ? "No pude saber hacia dónde mira: si la punta quedó a la izquierda, pulsa Voltear."
                : photo.flipped
                  ? "Miraba a la izquierda y la volteé. Revisa que la punta quede a la derecha."
                  : "Revisa que la punta quede a la derecha; si no, pulsa Voltear."}
              {photo.background === "conservado" ? " No pude quitarle el fondo: queda mejor con una foto de fondo blanco." : ""}
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <label className="block">
                <span className={labelCls}>Marca</span>
                <input name="brand" required maxLength={60} defaultValue={tidyBrand(group.brand, startTitle)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Nombre del modelo</span>
                <input name="name" required minLength={3} maxLength={120} defaultValue={tidyName(startTitle)} className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className={labelCls}>Tipo</span>
              <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={selectAutoCls}>
                <option value="tenis">Tenis</option>
                <option value="ropa">Ropa</option>
                <option value="accesorio">Accesorio</option>
              </select>
            </label>
            <button type="submit" disabled={busy} className={btnPrimary}>
              Crear el modelo y enlazar {group.itemIds.length === 1 ? "el par" : `los ${group.itemIds.length} pares`}
            </button>
            <p className="text-xs text-muted">Queda como modelo del catálogo con esta foto. El par sale en la web, con el precio del revendedor, al pulsar Actualizar catálogo.</p>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Row({ group, catalog }: { group: PendingGroup; catalog: PendingModel[] }) {
  const [open, setOpen] = useState<"" | "buscar" | "foto">("");
  const [q, setQ] = useState("");
  const found = useMemo(() => {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return catalog.filter((m) => tokens.every((t) => norm(`${m.brand} ${m.name}`).includes(t))).slice(0, 6);
  }, [q, catalog]);
  const toggle = (which: "buscar" | "foto") => setOpen((v) => (v === which ? "" : which));
  const linkCls = "text-xs font-semibold underline underline-offset-2";

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
        <div className="flex shrink-0 gap-4">
          <button type="button" onClick={() => toggle("buscar")} aria-expanded={open === "buscar"} className={linkCls}>
            {open === "buscar" ? "Cerrar búsqueda" : "Buscar el modelo"}
          </button>
          <button type="button" onClick={() => toggle("foto")} aria-expanded={open === "foto"} className={linkCls}>
            {open === "foto" ? "Cerrar" : "Subir foto"}
          </button>
        </div>
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

      {open === "buscar" && (
        <div className="mt-3 rounded-lg border border-line bg-paper p-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Escribe el modelo como está en el catálogo (ej: dunk panda)" aria-label={`Buscar el modelo de ${group.title}`} className={inputCls} />
          {q.trim() && found.length === 0 && <p className="mt-2 text-xs text-muted">Ese modelo no está en el catálogo todavía: súbelo con su foto.</p>}
          {found.length > 0 && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {found.map((m) => (
                <ModelButton key={m.slug} group={group} model={m} />
              ))}
            </div>
          )}
        </div>
      )}

      {open === "foto" && <PhotoUpload group={group} />}
    </li>
  );
}

/** "Por completar": cada referencia con los modelos del catálogo que se le parecen, para confirmarla con un clic, o para crear su modelo con una foto. */
export default function PendingList({ groups, catalog }: { groups: PendingGroup[]; catalog: PendingModel[] }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {groups.map((g) => (
        <Row key={g.key} group={g} catalog={catalog} />
      ))}
    </ul>
  );
}
