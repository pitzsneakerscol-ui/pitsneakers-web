"use client";

import { useActionState, useState } from "react";
import { saveTemplate } from "@/app/admin/actions";
import { TEMPLATE_VARS, siteVars, type TemplateData } from "@/lib/email-templates";
import EmailPreview from "@/components/admin/EmailPreview";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

const SAMPLE = {
  nombre: "Carlos",
  monto: "$350.000",
  concepto: "Dunk Low Panda talla 9.5",
  fecha_limite: "15 de octubre",
};

export default function TemplateEditor({ template }: { template?: TemplateData }) {
  const [state, action, pending] = useActionState(saveTemplate, undefined);
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const k = template?.key ?? "new";
  return (
    <form onSubmit={submitWith(action)} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {template && <input type="hidden" name="key" value={template.key} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor={`te-name-${k}`}>Nombre de la plantilla</label>
            <input id={`te-name-${k}`} name="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor={`te-subject-${k}`}>Asunto</label>
            <input id={`te-subject-${k}`} name="subject" required maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor={`te-body-${k}`}>Mensaje</label>
          <textarea id={`te-body-${k}`} name="body" required rows={16} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} className={`${inputCls} font-mono text-[13px] leading-relaxed`} />
          <p className="mt-1.5 text-xs text-muted">
            Variables: {TEMPLATE_VARS.map((v) => `{{${v.key}}}`).join("  ")}
          </p>
          <p className="mt-1 text-xs text-muted">
            Formato: <code># titular</code> · <code>==rojo==</code> · <code>**negrita**</code> · <code>&gt; caja destacada</code> · <code>- lista</code> · <code>[boton: Texto | https://enlace]</code> · <code>---</code> línea
          </p>
        </div>
        {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
        {state?.ok && state.message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>}
        <button type="submit" disabled={pending} className={btnAccent}>
          {pending ? "Guardando…" : template ? "Guardar plantilla" : "Crear plantilla"}
        </button>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Vista previa (con datos de ejemplo)</p>
        <EmailPreview subject={subject} body={body} vars={{ ...siteVars(), ...SAMPLE }} height={560} />
      </div>
    </form>
  );
}
