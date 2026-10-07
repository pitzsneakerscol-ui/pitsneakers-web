"use client";

import { useActionState } from "react";
import { saveTemplate } from "@/app/admin/actions";
import { TEMPLATE_VARS, type TemplateData } from "@/lib/email-templates";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

export default function TemplateEditor({ template }: { template?: TemplateData }) {
  const [state, action, pending] = useActionState(saveTemplate, undefined);
  const k = template?.key ?? "new";
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      {template && <input type="hidden" name="key" value={template.key} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={`te-name-${k}`}>Nombre de la plantilla</label>
          <input id={`te-name-${k}`} name="name" required maxLength={80} defaultValue={template?.name} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`te-subject-${k}`}>Asunto</label>
          <input id={`te-subject-${k}`} name="subject" required maxLength={160} defaultValue={template?.subject} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor={`te-body-${k}`}>Mensaje</label>
        <textarea id={`te-body-${k}`} name="body" required rows={10} maxLength={5000} defaultValue={template?.body} className={`${inputCls} font-mono text-[13px] leading-relaxed`} />
        <p className="mt-1.5 text-xs text-muted">Variables: {TEMPLATE_VARS.map((v) => `{{${v.key}}}`).join("  ")}</p>
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      {state?.ok && state.message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>}
      <button type="submit" disabled={pending} className={btnAccent}>
        {pending ? "Guardando…" : template ? "Guardar plantilla" : "Crear plantilla"}
      </button>
    </form>
  );
}
