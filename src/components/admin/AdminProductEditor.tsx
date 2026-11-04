"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetVariant, saveVariant } from "@/app/admin/precios/actions";
import { btnGhost, btnPrimary, inputCls } from "@/components/reseller/ui";

export interface EditableVariant {
  id: string;
  condition: string;
  price: number;
  priceBefore: number;
  sizes: string[];
  /** Tiene un ajuste hecho a mano desde el panel. */
  adjusted: boolean;
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
export default function AdminProductEditor({ variants }: { variants: EditableVariant[] }) {
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
          {variants.map((v) => (
            <VariantForm key={`${v.id}-${v.price}-${v.priceBefore}-${v.sizes.join(",")}-${v.adjusted}`} v={v} />
          ))}
        </div>
      )}
    </section>
  );
}
