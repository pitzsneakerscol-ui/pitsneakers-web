import type { Metadata } from "next";
import Link from "next/link";
import { campaignSummaries, pendingCount } from "@/lib/campaigns";
import { contactStats } from "@/lib/contacts";
import { isEmailConfigured } from "@/lib/email";
import { fmtDateTime } from "@/lib/admin-shared";
import CampaignForm from "@/components/admin/CampaignForm";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";
import { btnGhost, cardCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Campaña de correo" };
export const dynamic = "force-dynamic";

export default async function CampanaPage() {
  const [stats, summaries] = await Promise.all([contactStats(), campaignSummaries()]);
  const first = CAMPAIGN_TEMPLATES[0];
  const defaultCampaign = first.campaign;
  const pending = await pendingCount(defaultCampaign);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Campaña de correo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Escribe a los contactos de la comunidad. Cada correo lleva su enlace personal para darse de baja, y quien se da de baja no vuelve a recibir nada. Los envíos salen por Resend, de a 100 por llamada.
          </p>
        </div>
        <Link href="/admin/contactos" className={btnGhost}>← Contactos</Link>
      </header>

      {stats.active === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>
          No hay contactos activos. Primero importa el CSV en <Link href="/admin/contactos" className="font-semibold text-accent underline">Contactos</Link>.
        </div>
      ) : (
        <>
          <p className="text-xs text-muted">{stats.active} contactos activos · {pending} pendientes en “{defaultCampaign}”</p>
          <CampaignForm defaults={{ campaign: defaultCampaign, subject: first.subject, body: first.body }} active={stats.active} configured={isEmailConfigured()} />
        </>
      )}

      {summaries.length > 0 && (
        <section className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
          <h2 className="font-display text-2xl tracking-wide">Campañas enviadas</h2>
          <table className="mt-3 w-full min-w-[30rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pr-3 font-semibold">Campaña</th>
                <th className="px-3 py-2 font-semibold">Enviados</th>
                <th className="px-3 py-2 font-semibold">Fallidos</th>
                <th className="px-3 py-2 font-semibold">Último envío</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.campaign} className="border-t border-line">
                  <td className="py-2.5 pr-3 font-medium">{s.campaign}</td>
                  <td className="px-3 py-2.5">{s.sent}{s.sending > 0 && <span className="text-xs text-muted"> (+{s.sending} sin confirmar)</span>}</td>
                  <td className="px-3 py-2.5">{s.failed}</td>
                  <td className="px-3 py-2.5 text-muted">{fmtDateTime(s.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
