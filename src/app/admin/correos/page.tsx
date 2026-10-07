import type { Metadata } from "next";
import { getPayment, listCustomers, listEmailLog, listResellers, listTemplates } from "@/lib/admin";
import { isEmailConfigured } from "@/lib/email";
import { renderEmailText } from "@/lib/email-templates";
import { fmtDateTime } from "@/lib/admin-shared";
import { cardCls } from "@/components/reseller/ui";
import ComposeForm, { type Contact } from "@/components/admin/ComposeForm";

export const metadata: Metadata = { title: "Correos" };

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ rev?: string; cli?: string; pago?: string; plantilla?: string }>;
}) {
  const sp = await searchParams;
  const [templates, resellers, customers, log] = await Promise.all([
    listTemplates(),
    listResellers(),
    listCustomers(),
    listEmailLog(100),
  ]);

  const resellerContacts: Contact[] = resellers
    .filter((r) => r.email && !r.suspended)
    .map((r) => ({ token: `r:${r.id}`, name: r.displayName || r.username, email: r.email }));
  const customerContacts: Contact[] = customers
    .filter((c) => c.email)
    .map((c) => ({ token: `c:${c.id}`, name: c.name, email: c.email }));

  // Pre-llenado desde otras pantallas: ?rev=ID, ?cli=ID, ?pago=ID, ?plantilla=clave
  const selected: string[] = [];
  let template = sp.plantilla ?? "aviso_general";
  let monto = "";
  let concepto = "";
  let fechaLimite = "";
  if (Number(sp.rev)) selected.push(`r:${Number(sp.rev)}`);
  if (Number(sp.cli)) selected.push(`c:${Number(sp.cli)}`);
  if (Number(sp.pago)) {
    const p = await getPayment(Number(sp.pago));
    if (p) {
      selected.push(`${p.partyType === "reseller" ? "r" : "c"}:${p.partyId}`);
      monto = String(p.amount);
      concepto = p.concept;
      fechaLimite = p.dueDate;
      if (!sp.plantilla) template = p.overdue ? "pago_vencido" : "recordatorio_pago";
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Correos</h1>
        <p className="mt-2 text-sm text-muted">Escribe a compradores y revendedores con plantillas. Cada mensaje sale con la marca de Pitsneakers.</p>
      </header>

      <ComposeForm
        key={`${sp.rev}-${sp.cli}-${sp.pago}-${sp.plantilla}`}
        templates={templates}
        resellers={resellerContacts}
        customers={customerContacts}
        initial={{ template, selected, monto, concepto, fechaLimite }}
        configured={isEmailConfigured()}
      />

      <section className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Historial</h2>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aún no has enviado correos.</p>
        ) : (
          <table className="mt-3 w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Para</th>
                <th className="px-3 py-2 font-semibold">Asunto</th>
                <th className="py-2 pl-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {log.map((m) => (
                <tr key={m.id} className="border-b border-line/70 align-top">
                  <td className="whitespace-nowrap py-2.5 pr-3 text-muted">{fmtDateTime(m.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    {m.toName && <span className="block font-medium">{m.toName}</span>}
                    <span className="text-xs text-muted">{m.toEmail}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <details>
                      <summary className="cursor-pointer">{m.subject}</summary>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-3 text-xs leading-relaxed text-muted">{renderEmailText(m.body)}</p>
                    </details>
                  </td>
                  <td className="py-2.5 pl-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${m.status === "enviado" ? "bg-emerald-100 text-emerald-800" : "bg-accent/10 text-accent"}`}>{m.status}</span>
                    {m.error && <p className="mt-1 max-w-[16rem] text-xs text-accent">{m.error}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
