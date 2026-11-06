"use client";

import { useActionState } from "react";
import { removeItemPhoto, verifyItem } from "@/app/admin/actions";
import PhotoPicker from "@/components/admin/PhotoPicker";
import { btnPrimary, inputCls, submitWith } from "@/components/reseller/ui";
import { MAX_PHOTOS, REQUIRED_CHECKS, VERIF_CHECKS, VERIF_RESULTS, type SellerVerification } from "@/lib/verification-shared";

/**
 * Verificación de un par de inventario con compra confirmada: el equipo marca los puntos, sube las fotos que va tomando
 * (también evidencia de réplica o mal estado) y escribe la conclusión. El vendedor lo sigue en vivo desde su inventario.
 */
export default function ItemVerifyAdmin({ itemId, v }: { itemId: number; v: SellerVerification | null }) {
  const [state, action, pending] = useActionState(verifyItem, undefined);
  const photos = v?.photoIds ?? [];
  const checks = v?.checks ?? [];

  return (
    <details className="mt-2 rounded-lg border border-line text-xs" open={Boolean(v && v.result === "")}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
        <span className="font-semibold uppercase tracking-wide">🔎 Verificar el par</span>
        {v?.result ? (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${v.result === "ok" ? "bg-emerald-100 text-emerald-800" : v.result === "detalle" ? "bg-amber-100 text-amber-800" : "bg-accent/10 text-accent"}`}>
            {VERIF_RESULTS.find((r) => r.key === v.result)?.label}
          </span>
        ) : v ? (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800">En revisión</span>
        ) : null}
        {photos.length > 0 ? <span className="text-muted">{photos.length} foto{photos.length === 1 ? "" : "s"}</span> : null}
      </summary>
      <div className="space-y-3 border-t border-line p-3">
        {photos.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {photos.map((pid) => (
              <li key={pid} className="relative">
                <a href={`/api/revendedores/verificacion/par/${pid}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/revendedores/verificacion/par/${pid}`} alt="Foto de la verificación" loading="lazy" className="h-16 w-16 rounded-lg border border-line object-cover" />
                </a>
                <form action={removeItemPhoto} className="absolute -right-1.5 -top-1.5">
                  <input type="hidden" name="photo" value={pid} />
                  <button type="submit" aria-label="Borrar foto" className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white hover:bg-accent">×</button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}

        <form onSubmit={submitWith(action)} className="space-y-3">
          <input type="hidden" name="itemId" value={itemId} />
          <fieldset className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            <legend className="sr-only">Puntos de la verificación</legend>
            {VERIF_CHECKS.map((c) => (
              <label key={c.key} className="flex items-start gap-2">
                <input type="checkbox" name="check" value={c.key} defaultChecked={checks.includes(c.key)} className="mt-0.5 h-4 w-4 flex-none accent-accent" />
                <span>
                  <span className="font-semibold">{c.label}</span>
                  {REQUIRED_CHECKS.includes(c.key) ? <span className="text-accent"> *</span> : null}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
            Conclusión
            <select name="result" defaultValue={v?.result ?? ""} className={`${inputCls} mt-1 normal-case tracking-normal`}>
              <option value="">Aún revisando</option>
              {VERIF_RESULTS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
            Mensaje para el vendedor (lo ve él)
            <input name="message" defaultValue={v?.message ?? ""} maxLength={400} autoComplete="off" placeholder="Ej: la costura del talón no es la original" className={`${inputCls} mt-1 normal-case tracking-normal`} />
          </label>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Fotos de la verificación (también evidencia de réplica o mal estado)
            <div className="mt-1 normal-case tracking-normal"><PhotoPicker room={MAX_PHOTOS - photos.length} /></div>
          </div>
          <label className="flex items-center gap-2 text-muted">
            <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-accent" />
            Avisarle al vendedor en su panel
          </label>
          <button type="submit" disabled={pending} className={`${btnPrimary} !px-5 !py-2.5`}>
            {pending ? "Guardando…" : "Guardar verificación"}
          </button>
          {state?.error && <p role="alert" className="text-accent">{state.error}</p>}
          {state?.ok && state.message && <p role="status" className="text-emerald-700">{state.message}</p>}
        </form>
      </div>
    </details>
  );
}
