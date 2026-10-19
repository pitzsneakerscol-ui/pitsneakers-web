import type { Metadata } from "next";
import { listReviews, type ReviewStatus } from "@/lib/reviews";
import { siteConfig } from "@/config/site";
import { ago } from "@/lib/admin-shared";
import { btnGhost, btnPrimary, cardCls } from "@/components/reseller/ui";
import ConfirmForm from "@/components/admin/ConfirmForm";
import CopyLink from "@/components/admin/CopyLink";
import { moderateReview } from "./actions";

export const metadata: Metadata = { title: "Reseñas de clientes" };

const LABEL: Record<ReviewStatus, string> = { pending: "Por revisar", approved: "Publicada", rejected: "Rechazada" };

export default async function ResenasPage() {
  const rows = await listReviews();
  const link = `${siteConfig.siteUrl}/resena`;
  const pending = rows.filter((r) => r.status === "pending").length;
  const approved = rows.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Reseñas de clientes</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Tus clientes dejan su reseña con foto en el enlace de abajo. Nada se publica hasta que la apruebes aquí.
        </p>
      </header>

      <div className={`${cardCls} p-4`}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Enlace para tus clientes</p>
        <CopyLink value={link} />
        <p className="mt-2 text-[11px] text-muted">Compártelo por WhatsApp o inclúyelo en el empaque. Funciona aunque el sitio esté en “Próximamente”.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Por revisar</p>
          <p className="font-display text-4xl tracking-wide text-accent">{pending}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Publicadas</p>
          <p className="font-display text-4xl tracking-wide">{approved}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total recibidas</p>
          <p className="font-display text-4xl tracking-wide">{rows.length}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>Aún no ha llegado ninguna reseña.</div>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className={`${cardCls} flex flex-col gap-4 p-4 sm:flex-row`}>
              {r.hasPhoto && (
                // Foto privada hasta aprobarla: la sirve la API solo al dueño.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/resenas/${r.id}/foto`} alt={`Foto de ${r.name}`} className="h-48 w-full rounded-lg border border-line object-cover sm:h-40 sm:w-40 sm:shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-accent" aria-label={`${r.rating} de 5 estrellas`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      r.status === "pending" ? "bg-accent text-white" : r.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-muted"
                    }`}
                  >
                    {LABEL[r.status]}
                  </span>
                </div>
                {r.product && <p className="mt-0.5 text-xs text-muted">{r.product}</p>}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">“{r.text}”</p>
                <p className="mt-2 text-[11px] text-muted">
                  {ago(r.createdAt)}
                  {r.email && <> · {r.email}</>}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status !== "approved" && <ConfirmForm action={moderateReview} fields={{ id: r.id, action: "aprobar" }} label="Aprobar y publicar" className={btnPrimary} />}
                  {r.status === "approved" && <ConfirmForm action={moderateReview} fields={{ id: r.id, action: "pendiente" }} label="Despublicar" className={btnGhost} />}
                  {r.status === "pending" && <ConfirmForm action={moderateReview} fields={{ id: r.id, action: "rechazar" }} label="Rechazar" className={btnGhost} />}
                  <ConfirmForm action={moderateReview} fields={{ id: r.id, action: "borrar" }} label="Borrar" confirm="¿Borrar esta reseña para siempre?" className={btnGhost} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
