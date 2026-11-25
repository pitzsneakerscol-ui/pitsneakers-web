import type { Metadata } from "next";
import Link from "next/link";
import { getCatalogEntries } from "@/lib/reseller-catalog";
import { listUsedForReview, type UsedReviewRow } from "@/lib/used-pairs";
import { USED_MIN_PHOTOS } from "@/lib/used-shared";
import { ago } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { btnAccent, btnGhost, cardCls, inputCls } from "@/components/reseller/ui";
import { reviewUsed } from "@/app/admin/usados/actions";

export const metadata: Metadata = { title: "Pares usados por revisar" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  nota: "Para rechazar escribe el motivo: es lo que le llega al vendedor para corregirlo.",
  revisado: "Ese par ya había sido revisado.",
  datos: "No se pudo leer la revisión. Intenta de nuevo.",
};

function Photos({ ids, name }: { ids: number[]; name: string }) {
  if (ids.length === 0) return <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">Este par no tiene fotos.</p>;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {ids.map((id, n) => (
        <li key={id}>
          <a href={`/api/usados/foto/${id}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-line bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/usados/foto/${id}`} alt={`Foto ${n + 1} de ${name}`} loading="lazy" className="aspect-square w-full object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function UsedReviewPage({ searchParams }: { searchParams: Promise<{ listo?: string; error?: string }> }) {
  const { listo, error } = await searchParams;
  const [{ pending, recent }, catalog] = await Promise.all([listUsedForReview(), getCatalogEntries()]);
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));

  const card = (r: UsedReviewRow, review: boolean) => {
    const model = bySlug.get(r.catalogSlug);
    const wear = r.notes.match(/^Usado — estado (\d+)\/10/)?.[1];
    return (
      <li key={r.id} className={`${cardCls} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl tracking-wide">
              {r.brand ? `${r.brand} ` : ""}
              {r.name}
              {r.colorway ? ` ${r.colorway}` : ""}
            </p>
            <p className="text-sm text-muted">
              Talla {r.size || "?"} · pide {formatPrice(r.price)}
              {wear ? ` · estado ${wear}/10` : ""} ·{" "}
              <Link href={`/admin/revendedores/${r.userId}`} className="underline">
                {r.sellerName}
              </Link>{" "}
              · {ago(r.createdAt)}
            </p>
            {r.notes && <p className="mt-1 text-xs text-muted">{r.notes}</p>}
          </div>
          {!review && (
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${r.status === "aprobado" ? "bg-emerald-100 text-emerald-800" : "bg-accent/15 text-accent"}`}>
              {r.status}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_200px]">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Fotos del vendedor ({r.photoIds.length}
              {r.photoIds.length < USED_MIN_PHOTOS ? `, faltan ${USED_MIN_PHOTOS - r.photoIds.length}` : ""})
            </p>
            <Photos ids={r.photoIds} name={r.name} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Silueta elegida</p>
            {model ? (
              <div className="overflow-hidden rounded-lg border border-line bg-[#ebe8e2]">
                {model.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={model.image} alt={model.name} className="aspect-[4/3] w-full object-contain p-2 mix-blend-multiply" />
                )}
                <p className="bg-paper-raised px-2.5 py-2 text-xs font-semibold">
                  {model.brand} {model.name}
                  {model.colorway ? ` · ${model.colorway}` : ""}
                </p>
              </div>
            ) : (
              <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">No eligió una silueta del catálogo.</p>
            )}
          </div>
        </div>

        {review ? (
          <form action={reviewUsed} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <input type="hidden" name="id" value={r.id} />
            <div className="min-w-[220px] flex-1">
              <label htmlFor={`note-${r.id}`} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                Motivo (obligatorio solo si lo rechazas)
              </label>
              <input id={`note-${r.id}`} name="note" maxLength={300} placeholder="Ej: la suela no se ve, sube una foto del talón…" className={inputCls} />
            </div>
            <button type="submit" name="decision" value="rechazado" className={btnGhost}>
              Rechazar
            </button>
            <button type="submit" name="decision" value="aprobado" className={btnAccent}>
              Aprobar
            </button>
          </form>
        ) : (
          r.reviewNote && <p className="mt-3 text-sm text-muted">Motivo: {r.reviewNote}</p>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Pares usados</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Los pares usados que suben los vendedores esperan aquí. Mira las fotos, confirma que la silueta es la correcta y apruébalos o recházalos con el motivo. Al aprobar, se publican con sus fotos reales la próxima vez que pulses{" "}
          <Link href="/admin/catalogo" className="underline">
            Actualizar catálogo
          </Link>
          .
        </p>
      </header>

      {listo && (
        <p role="status" className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">
          {listo === "aprobado" ? "Par aprobado. Se publica al actualizar el catálogo." : "Par rechazado. El vendedor recibió el motivo."}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
          {ERRORS[error] ?? ERRORS.datos}
        </p>
      )}

      <section>
        <h2 className="mb-3 font-display text-2xl tracking-wide">Por revisar ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className={`${cardCls} px-4 py-6 text-sm text-muted`}>No hay pares usados esperando revisión.</p>
        ) : (
          <ul className="space-y-4">{pending.map((r) => card(r, true))}</ul>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl tracking-wide">Revisados recientemente</h2>
          <ul className="space-y-4">{recent.map((r) => card(r, false))}</ul>
        </section>
      )}
    </div>
  );
}
