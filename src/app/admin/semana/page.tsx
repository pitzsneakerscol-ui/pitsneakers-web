import type { Metadata } from "next";
import { getWeeklyReport, weeklyEmail } from "@/lib/weekly";
import { renderEmailHtml } from "@/lib/email-templates";
import { isEmailConfigured } from "@/lib/email";
import { siteConfig } from "@/config/site";
import { btnPrimary, cardCls } from "@/components/reseller/ui";
import { sendWeeklyNow } from "./actions";

export const metadata: Metadata = { title: "Resumen semanal" };

export default async function SemanaPage({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  const { ok, e } = await searchParams;
  const mail = weeklyEmail(await getWeeklyReport());
  const to = (process.env.WEEKLY_REPORT_TO ?? "").trim() || siteConfig.contactEmail;
  const cronReady = Boolean((process.env.CRON_SECRET ?? "").trim());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Resumen semanal</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Cada lunes a las 7:00 (hora de Colombia) te llega este resumen por correo a <strong className="text-ink">{to}</strong>: ventas, envíos, ofertas, cobros, comunidad y los pares que llevan más tiempo sin moverse. Aquí ves cómo se vería hoy.
        </p>
      </header>

      {e ? <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">No se pudo enviar: {e}</p> : null}
      {ok ? <p role="status" className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">Resumen enviado a {ok}. Revisa tu bandeja (y el spam la primera vez).</p> : null}

      {!isEmailConfigured() ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El envío de correos no está activo: faltan <code>RESEND_API_KEY</code> y <code>EMAIL_FROM</code>. Sin eso no se puede mandar el resumen.
        </p>
      ) : null}
      {!cronReady ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Falta la variable <code>CRON_SECRET</code> en Vercel: sin ella la tarea del lunes no se ejecuta. Es la misma que usa la actualización diaria del catálogo.
        </p>
      ) : null}

      <section className={`${cardCls} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Asunto</span>
            <span className="block truncate font-semibold">{mail.subject}</span>
          </p>
          <form action={sendWeeklyNow}>
            <button type="submit" className={btnPrimary} disabled={!isEmailConfigured()}>Enviármelo ahora</button>
          </form>
        </div>
      </section>

      <iframe title="Vista previa del resumen semanal" sandbox="" srcDoc={renderEmailHtml(mail.subject, mail.body)} className="h-[56rem] w-full rounded-xl border border-line bg-white" />
    </div>
  );
}
