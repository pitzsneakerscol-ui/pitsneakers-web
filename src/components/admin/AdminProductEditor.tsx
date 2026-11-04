"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSiluetaVariant, removeSiluetaVariant, resetVariant, saveVariant, setSiluetaFeatured } from "@/app/admin/precios/actions";
import { btnAccent, btnGhost, btnPrimary, inputCls } from "@/components/reseller/ui";

export interface EditableVariant {
  id: string;
  condition: string;
  price: number;
  priceBefore: number;
  sizes: string[];
  /** Tiene un ajuste hecho a mano desde el panel. */
  adjusted: boolean;
  /** Se agregó a mano desde este mismo editor (se puede eliminar). */
  extra: boolean;
}

const pesos = (n: number) => n.toLocaleString("es-CO");
const digits = (v: string) => Number(v.replace(/\D/g, "")) || 0;

function VariantForm({ v }: { v: EditableVariant }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [price, setPrice] = useState(pesos(v.price));
  const [before, setBefore] = useState(v.priceBefore ? pesos(v.priceBefore) : "");
  const [sizes, setSizes] = useState(v.sizes);
  const [newSize, setNewSize] = useState("");
  const [hidden, setHidden] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function addSize() {
    const s = newSize.trim().replace(",", ".");
    if (!s) return;
    if (sizes.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setMsg({ ok: false, text: `La talla ${s} ya está.` });
      return;
    }
    setSizes([...sizes, s]);
    setNewSize("");
    setMsg(null);
  }

  function run(job: () => Promise<{ ok: true } | { ok: false; error: string }>, okText: string) {
    setMsg(null);
    start(async () => {
      const r = await job();
      if (r.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  const emptied = sizes.length === 0 && v.sizes.length > 0;

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{v.id}</p>
        <span className="text-xs capitalize text-muted">{v.condition}</span>
        {v.extra && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Agregado por ti</span>}
        {v.adjusted && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Ajustado a mano</span>}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`ae-p-${v.id}`} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Precio</label>
          <input id={`ae-p-${v.id}`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor={`ae-b-${v.id}`} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Precio antes (promo)</label>
          <input id={`ae-b-${v.id}`} inputMode="numeric" value={before} placeholder="Sin promo" onChange={(e) => setBefore(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Tallas</p>
        <ul className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded-full border border-line bg-paper-raised py-1 pl-3 pr-1.5 text-sm">
              {s}
              <button
                type="button"
                onClick={() => setSizes(sizes.filter((x) => x !== s))}
                aria-label={`Quitar la talla ${s}`}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-accent hover:text-white"
              >
                ✕
              </button>
            </li>
          ))}
          {sizes.length === 0 && <li className="text-sm text-muted">Sin tallas</li>}
        </ul>
        <div className="mt-2.5 flex gap-2">
          <input
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSize();
              }
            }}
            maxLength={10}
            placeholder="Agregar talla (9.5, M…)"
            aria-label="Nueva talla"
            className={`${inputCls} max-w-[12rem]`}
          />
          <button type="button" onClick={addSize} className={btnGhost}>Agregar</button>
        </div>
        {emptied && <p className="mt-2 text-xs text-accent">Quitaste todas las tallas: al guardar, este par se oculta de la tienda.</p>}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
        Ocultar este par de la tienda
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveVariant({ sku: v.id, price: digits(price), priceBefore: digits(before), sizes, hidden }), "Guardado. Ya se ve en la tienda.")}
          className={btnPrimary}
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {v.adjusted && (
          <button type="button" disabled={pending} onClick={() => run(() => resetVariant(v.id), "Volvió al original.")} className={btnGhost}>
            Volver al original
          </button>
        )}
        {v.extra && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("¿Eliminar esta opción (tallas y precio) de la silueta?")) run(() => removeSiluetaVariant(v.id), "Eliminada.");
            }}
            className={btnGhost}
          >
            Eliminar esta opción
          </button>
        )}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-600" : "text-accent"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}

/** Interruptor de Destacados: se guarda al tocarlo. Destacados (portada) muestra 6 siluetas y solo sneakers con foto. */
function FeaturedToggle({ slug, featured, canFeature }: { slug: string; featured: boolean; canFeature: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(featured);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle(next: boolean) {
    setMsg(null);
    setOn(next);
    start(async () => {
      const r = await setSiluetaFeatured(slug, next);
      if (r.ok) {
        setMsg({ ok: true, text: next ? "Listo: quedó en Destacados." : "Listo: salió de Destacados." });
        router.refresh();
      } else {
        setOn(!next);
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  if (!canFeature) {
    return (
      <div className="rounded-xl border border-line bg-paper p-4 text-sm text-muted">
        <p className="font-semibold text-ink">Destacados</p>
        <p className="mt-1">Esta silueta no puede ir en Destacados: ahí solo se muestran sneakers que tengan foto.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={on} disabled={pending} onChange={(e) => toggle(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
        <span>
          <span className="block text-sm font-semibold">Dejar en Destacados</span>
          <span className="block text-xs text-muted">Aparece en la portada, en “Destacados”. Ahí caben 6: los que fijas tú van primero (el último que fijas, de primero) y el resto se completa con los más costosos. Si lo desmarcas, no vuelve a salir ahí.</span>
        </span>
      </label>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-emerald-600" : "text-accent"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

/** Agrega a la silueta otra opción: una o varias tallas con su propio precio (ej. la 11 a otro precio). */
function AddVariantForm({ from }: { from: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sizes, setSizes] = useState("");
  const [price, setPrice] = useState("");
  const [before, setBefore] = useState("");
  const [condition, setCondition] = useState("nuevo");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function add() {
    setMsg(null);
    start(async () => {
      const r = await addSiluetaVariant({
        from,
        // Se separa por espacios o ";"; la coma decimal ("9,5") la normaliza el servidor y una coma al final ("11,") se ignora.
        sizes: sizes.split(/[\s;]+/).map((s) => s.replace(/[,;.]+$/, "")).filter(Boolean),
        price: digits(price),
        priceBefore: digits(before),
        condition,
      });
      if (r.ok) {
        setMsg({ ok: true, text: "Agregada. Ya aparece en la silueta." });
        setSizes("");
        setPrice("");
        setBefore("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-paper p-4">
      <p className="text-sm font-semibold">Agregar otras tallas con otro precio</p>
      <p className="mt-1 text-xs text-muted">Crea una opción nueva dentro de esta misma silueta. Varias tallas con el mismo precio se separan con espacios: 11 11.5 12.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="ae-new-sizes" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Tallas</label>
          <input id="ae-new-sizes" value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="Ej. 11 11.5" className={inputCls} />
        </div>
        <div>
          <label htmlFor="ae-new-price" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Precio</label>
          <input id="ae-new-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1.200.000" className={inputCls} />
        </div>
        <div>
          <label htmlFor="ae-new-before" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Precio antes (promo)</label>
          <input id="ae-new-before" inputMode="numeric" value={before} onChange={(e) => setBefore(e.target.value)} placeholder="Sin promo" className={inputCls} />
        </div>
        <div>
          <label htmlFor="ae-new-cond" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">Condición</label>
          <select id="ae-new-cond" value={condition} onChange={(e) => setCondition(e.target.value)} className={inputCls}>
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={add} className={btnAccent}>
          {pending ? "Agregando…" : "Agregar a la silueta"}
        </button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-600" : "text-accent"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Editor de la página del producto. Solo aparece si quien mira tiene la sesión del dueño: la página es pública y estática,
 * así que se pregunta al navegador (/api/sesion) y, al guardar, el servidor vuelve a comprobar el permiso.
 */
export default function AdminProductEditor({ variants, slug, featured, canFeature }: { variants: EditableVariant[]; slug: string; featured: boolean; canFeature: boolean }) {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/sesion", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setAdmin(Boolean(j?.admin)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!admin) return null;

  return (
    <section aria-label="Administrar este producto" className="mt-10 rounded-2xl border-2 border-dashed border-accent/60 bg-paper-raised p-4 sm:p-6">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Solo tú ves esto</span>
          <span className="block font-display text-2xl tracking-wide">Administrar este producto</span>
        </span>
        <span aria-hidden="true" className="text-xl">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted">Cambia el precio, quita o agrega tallas y guarda. El cambio se ve al instante en la tienda y en el pago.</p>
          <FeaturedToggle slug={slug} featured={featured} canFeature={canFeature} />
          {variants.map((v) => (
            <VariantForm key={`${v.id}-${v.price}-${v.priceBefore}-${v.sizes.join(",")}-${v.adjusted}`} v={v} />
          ))}
          {variants[0] && <AddVariantForm from={variants[0].id} />}
        </div>
      )}
    </section>
  );
}
