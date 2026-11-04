"use client";

import { useActionState, useState } from "react";
import { sendCampaignAction, sendCampaignTest } from "@/app/admin/contactos/campana/actions";
import { renderEmailHtml, renderTemplate, siteVars } from "@/lib/email-templates";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";
import { btnAccent, btnGhost, inputCls, labelCls, selectAutoCls, submitWith } from "@/components/reseller/ui";

export interface CampaignDefaults {
  campaign: string;
  subject: string;
  body: string;
}

export default function CampaignForm({ defaults, active, configured }: { defaults: CampaignDefaults; active: number; configured: boolean }) {
  const [subject, setSubject] = useState(defaults.subject);
  const [body, setBody] = useState(defaults.body);
  const [campaign, setCampaign] = useState(defaults.campaign);
  const [tplKey, setTplKey] = useState(CAMPAIGN_TEMPLATES.find((t) => t.subject === defaults.subject)?.key ?? "");
  const [limit, setLimit] = useState("30");
  const [testTo, setTestTo] = useState("");
  const [testState, testAction, testPending] = useActionState(sendCampaignTest, undefined);
  const [sendState, sendAction, sendPending] = useActionState(sendCampaignAction, undefined);

  const vars = { ...siteVars(), nombre: "Camilo" };
  const preview = renderEmailHtml(renderTemplate(subject, vars), renderTemplate(body, vars), { unsubscribeUrl: "#" });

  // Un solo <form> con los campos del mensaje; los botones eligen la acción.
  const tpl = CAMPAIGN_TEMPLATES.find((t) => t.key === tplKey);
  const pickTemplate = (key: string) => {
    const t = CAMPAIGN_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setTplKey(key);
    setSubject(t.subject);
    setBody(t.body);
    setCampaign(t.campaign);
  };

  const fields = (
    <>
      <div>
        <label className={labelCls} htmlFor="cm-tpl">Plantilla</label>
        <select id="cm-tpl" value={tplKey} onChange={(e) => pickTemplate(e.target.value)} className={selectAutoCls}>
          {CAMPAIGN_TEMPLATES.map((t) => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
        {tpl && <p className="mt-1.5 text-[11px] text-muted">Cuándo enviarla: {tpl.when} Al cambiar de plantilla se reemplaza el texto de abajo.</p>}
      </div>
      <div>
        <label className={labelCls} htmlFor="cm-subject">Asunto</label>
        <input id="cm-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} required className={inputCls} />
      </div>
      <div>
        <label className={labelCls} htmlFor="cm-body">Mensaje</label>
        <textarea id="cm-body" name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} maxLength={5000} required className={`${inputCls} font-mono text-xs leading-relaxed`} />
        <p className="mt-1.5 text-[11px] text-muted">
          Formato: <code># Titular</code>, <code>**negrita**</code>, <code>&gt; caja destacada</code>, <code>- viñetas</code>, <code>[boton: Texto | https://…]</code>. <code>{"{{nombre}}"}</code> se cambia por el primer nombre de cada contacto.
        </p>
      </div>
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-6">
        <form onSubmit={submitWith(testAction)} className="space-y-4">
          {fields}
          <div className="rounded-xl border border-line p-4">
            <h3 className="font-display text-xl tracking-wide">1. Mándate una prueba</h3>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[14rem] flex-1">
                <label className={labelCls} htmlFor="cm-testto">Tu correo</label>
                <input id="cm-testto" name="testTo" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="tucorreo@gmail.com" className={inputCls} />
              </div>
              <button type="submit" disabled={testPending || !configured} className={btnGhost}>
                {testPending ? "Enviando…" : "Enviar prueba"}
              </button>
            </div>
            {testState?.error && <p role="alert" className="mt-3 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{testState.error}</p>}
            {testState?.ok && testState.message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{testState.message}</p>}
          </div>
        </form>

        <form onSubmit={submitWith(sendAction)} className="space-y-4 rounded-xl border border-line p-4">
          <h3 className="font-display text-xl tracking-wide">2. Enviar a los contactos</h3>
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="body" value={body} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="cm-campaign">Nombre de la campaña</label>
              <input id="cm-campaign" name="campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={40} required className={inputCls} />
              <p className="mt-1.5 text-[11px] text-muted">Con este nombre se recuerda a quién ya se le envió: nadie recibe el mismo correo dos veces.</p>
            </div>
            <div>
              <label className={labelCls} htmlFor="cm-limit">Cuántos enviar ahora</label>
              <input id="cm-limit" name="limit" type="number" min={1} max={500} value={limit} onChange={(e) => setLimit(e.target.value)} required className={inputCls} />
              <p className="mt-1.5 text-[11px] text-muted">Empieza con 30 y mira cuántos rebotan en Resend antes de mandar el resto.</p>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
            <span>Revisé la prueba y quiero enviarlo a {Math.min(Number(limit) || 0, active)} personas de la lista ({active} contactos activos en total).</span>
          </label>
          {!configured && <p className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">El correo no está configurado (faltan RESEND_API_KEY y EMAIL_FROM).</p>}
          {sendState?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{sendState.error}</p>}
          {sendState?.ok && sendState.message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sendState.message}</p>}
          <button type="submit" disabled={sendPending || !configured} className={btnAccent}>
            {sendPending ? "Enviando… no cierres esta página" : "Enviar campaña"}
          </button>
        </form>
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Así se verá (con el nombre “Camilo”)</p>
        <iframe title="Vista previa del correo" sandbox="" srcDoc={preview} className="h-[44rem] w-full rounded-xl border border-line bg-white lg:sticky lg:top-4" />
      </div>
    </div>
  );
}
