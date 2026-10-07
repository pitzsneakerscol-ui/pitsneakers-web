"use client";

import { renderEmailHtml, renderTemplate, type Vars } from "@/lib/email-templates";

/** Vista previa exacta del correo (el mismo HTML que se envía), aislada en un iframe sin scripts. */
export default function EmailPreview({
  subject,
  body,
  vars,
  height = 640,
}: {
  subject: string;
  body: string;
  vars: Vars;
  height?: number;
}) {
  const finalSubject = renderTemplate(subject, vars);
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        Asunto: <span className="normal-case tracking-normal text-ink">{finalSubject || "(sin asunto)"}</span>
      </p>
      <iframe
        title="Vista previa del correo"
        sandbox=""
        srcDoc={renderEmailHtml(finalSubject, renderTemplate(body, vars))}
        style={{ height }}
        className="w-full rounded-xl border border-line bg-white"
      />
    </div>
  );
}
