"use client";

import { useActionState, useMemo, useState } from "react";
import { sendEmails } from "@/app/admin/actions";
import { TEMPLATE_VARS, missingVars, renderTemplate, type TemplateData } from "@/lib/email-templates";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { btnAccent, cardCls, inputCls, labelCls, selectAutoCls, submitWith } from "@/components/reseller/ui";

export interface Contact {
  token: string; // "c:12" | "r:5"
  name: string;
  email: string;
}

export interface ComposeInitial {
  template: string;
  selected: string[];
  monto: string;
  concepto: string;
  fechaLimite: string;
}

export default function ComposeForm({
  templates,
  resellers,
  customers,
  initial,
  configured,
}: {
  templates: TemplateData[];
  resellers: Contact[];
  customers: Contact[];
  initial: ComposeInitial;
  configured: boolean;
}) {
  const startTemplate = templates.find((t) => t.key === initial.template) ?? templates[templates.length - 1];
  const [state, action, pending] = useActionState(sendEmails, undefined);
  const [template, setTemplate] = useState(startTemplate?.key ?? "");
  const [subject, setSubject] = useState(startTemplate?.subject ?? "");
  const [body, setBody] = useState(startTemplate?.body ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.selected));
  const [filter, setFilter] = useState("");
  const [monto, setMonto] = useState(initial.monto);
  const [concepto, setConcepto] = useState(initial.concepto);
  const [fecha, setFecha] = useState(initial.fechaLimite);
  const [extra, setExtra] = useState("");

  const all = useMemo(() => [...resellers, ...customers], [resellers, customers]);

  const toggle = (token: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });

  function pickTemplate(key: string) {
    setTemplate(key);
    const t = templates.find((x) => x.key === key);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  // Cuántos correos distintos se enviarán (los grupos y las selecciones individuales se unen).
  const emails = new Set<string>();
  for (const c of all) {
    if (selected.has(c.token) || (selected.has("g:resellers") && c.token.startsWith("r:")) || (selected.has("g:customers") && c.token.startsWith("c:")))
      emails.add(c.email.toLowerCase());
  }
  extra.split(/[,;\s]+/).filter((e) => /.+@.+\..+/.test(e)).forEach((e) => emails.add(e.toLowerCase()));

  const firstName = all.find((c) => selected.has(c.token))?.name ?? "Nombre";
  const digits = monto.replace(/\D/g, "");
  const vars = {
    nombre: firstName,
    tienda: siteConfig.name,
    whatsapp: `https://wa.me/${siteConfig.whatsappNumber}`,
    monto: digits ? formatPrice(Number(digits)) : "",
    concepto,
    fecha_limite: fecha,
  };
  const previewSubject = renderTemplate(subject, vars);
  const previewBody = renderTemplate(body, vars);
  const missing = missingVars(previewSubject + "\n" + previewBody);

  const needle = filter.trim().toLowerCase();
  const visible = (c: Contact) => !needle || `${c.name} ${c.email}`.toLowerCase().includes(needle);

  const group = (title: string, list: Contact[], groupToken: string) => (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title} ({list.length})</p>
        {list.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" name="recipients" value={groupToken} checked={selected.has(groupToken)} onChange={() => toggle(groupToken)} />
            Todos
          </label>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-muted">Ninguno tiene correo registrado.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
          {list.map((c) => (
            <li key={c.token} hidden={!visible(c)}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-paper">
                <input type="checkbox" name="recipients" value={c.token} checked={selected.has(c.token)} onChange={() => toggle(c.token)} />
                <span className="truncate">{c.name}</span>
                <span className="ml-auto truncate text-xs text-muted">{c.email}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <form onSubmit={submitWith(action)} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <input type="hidden" name="template" value={template} />

      <div className="space-y-6">
        <section className={`${cardCls} space-y-4 p-5 sm:p-6`}>
          <h2 className="font-display text-2xl tracking-wide">1. Destinatarios</h2>
          <div>
            <label htmlFor="cp-filter" className="sr-only">Buscar destinatario</label>
            <input id="cp-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar por nombre o correo…" className={inputCls} />
          </div>
          {group("Revendedores", resellers, "g:resellers")}
          {group("Compradores", customers, "g:customers")}
          <div>
            <label className={labelCls} htmlFor="cp-extra">Otros correos (separados por coma)</label>
            <input id="cp-extra" name="extra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="alguien@correo.com" className={inputCls} />
          </div>
          <p className="text-sm font-medium">{emails.size} correo{emails.size === 1 ? "" : "s"} para enviar</p>
        </section>

        <section className={`${cardCls} space-y-4 p-5 sm:p-6`}>
          <h2 className="font-display text-2xl tracking-wide">2. Mensaje</h2>
          <div>
            <label className={labelCls} htmlFor="cp-template">Plantilla</label>
            <select id="cp-template" value={template} onChange={(e) => pickTemplate(e.target.value)} className={`${selectAutoCls} w-full`}>
              {templates.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="cp-monto">Monto</label>
              <input id="cp-monto" name="monto" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="350000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="cp-concepto">Concepto</label>
              <input id="cp-concepto" name="concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="cp-fecha">Fecha límite</label>
              <input id="cp-fecha" name="fecha_limite" value={fecha} onChange={(e) => setFecha(e.target.value)} placeholder="15 de octubre" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="cp-subject">Asunto</label>
            <input id="cp-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={160} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cp-body">Mensaje</label>
            <textarea id="cp-body" name="body" value={body} onChange={(e) => setBody(e.target.value)} required rows={12} maxLength={5000} className={`${inputCls} font-mono text-[13px] leading-relaxed`} />
            <p className="mt-1.5 text-xs text-muted">
              Variables: {TEMPLATE_VARS.map((v) => `{{${v.key}}}`).join("  ")} — se llenan solas para cada persona.
            </p>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className={`${cardCls} p-5 sm:p-6 lg:sticky lg:top-6`}>
          <h2 className="font-display text-2xl tracking-wide">Vista previa</h2>
          <p className="mt-1 text-xs text-muted">Así lo verá {selected.size > 0 ? firstName : "el destinatario"}.</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <div className="bg-ink px-5 py-3 font-display text-xl tracking-wide text-white">
              PIT<span className="text-accent">SNEAKERS</span>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{previewSubject || "(sin asunto)"}</p>
              <p className="whitespace-pre-wrap leading-relaxed">{previewBody}</p>
            </div>
          </div>
          {missing.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Falta llenar: {missing.map((m) => `{{${m}}}`).join(", ")}
            </p>
          )}
          {!configured && (
            <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              El envío no está activo todavía: configura <code>RESEND_API_KEY</code> y <code>EMAIL_FROM</code>.
            </p>
          )}
          {state?.error && <p role="alert" className="mt-3 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
          {state?.ok && state.message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>}
          <button
            type="submit"
            disabled={pending || emails.size === 0 || missing.length > 0}
            onClick={(e) => {
              if (!window.confirm(`¿Enviar ${emails.size} correo${emails.size === 1 ? "" : "s"}?`)) e.preventDefault();
            }}
            className={`${btnAccent} mt-4 w-full`}
          >
            {pending ? "Enviando…" : `Enviar a ${emails.size} destinatario${emails.size === 1 ? "" : "s"}`}
          </button>
        </section>
      </div>
    </form>
  );
}
