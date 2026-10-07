import type { Metadata } from "next";
import { listTemplates } from "@/lib/admin";
import { deleteTemplate, restoreTemplate } from "@/app/admin/actions";
import { btnGhost, cardCls } from "@/components/reseller/ui";
import ConfirmForm from "@/components/admin/ConfirmForm";
import TemplateEditor from "@/components/admin/TemplateEditor";

export const metadata: Metadata = { title: "Plantillas de correo" };

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Plantillas</h1>
        <p className="mt-2 text-sm text-muted">Edita los textos que usas para escribir a compradores y revendedores, o crea los tuyos.</p>
      </header>

      <details className={`${cardCls} p-5 sm:p-6`}>
        <summary className="cursor-pointer font-display text-2xl tracking-wide">Crear plantilla nueva</summary>
        <div className="mt-5"><TemplateEditor /></div>
      </details>

      <ul className="space-y-3">
        {templates.map((t) => (
          <li key={t.key} className={`${cardCls} p-4 sm:p-5`}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted">{t.builtin ? "Incluida" : "Tuya"} · {t.subject}</span>
              </summary>
              <div className="mt-5 space-y-4">
                <TemplateEditor template={t} />
                <div className="flex flex-wrap gap-2 border-t border-line/70 pt-4">
                  {t.builtin ? (
                    <ConfirmForm action={restoreTemplate} fields={{ key: t.key }} label="Restaurar texto original" confirm="¿Volver al texto original de esta plantilla? Se pierden tus cambios." className={btnGhost} />
                  ) : (
                    <ConfirmForm action={deleteTemplate} fields={{ key: t.key }} label="Borrar plantilla" confirm={`¿Borrar la plantilla "${t.name}"?`} className={`${btnGhost} text-accent hover:border-accent`} />
                  )}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
