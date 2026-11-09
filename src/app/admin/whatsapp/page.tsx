import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { isDbConfigured } from "@/lib/db";
import { waEnvStatus } from "@/lib/wa-cloud";
import { getWaContact, isWindowOpen, listConversations, listMessages, waCounts } from "@/lib/wa-bot";
import { fmtDateTime } from "@/lib/admin-shared";
import { btnGhost, btnPrimary, cardCls, inputCls } from "@/components/reseller/ui";
import { replyAction, returnToBotAction } from "./actions";

export const metadata: Metadata = { title: "Bot de WhatsApp" };
export const dynamic = "force-dynamic";

const ENV_ROWS: { key: keyof ReturnType<typeof waEnvStatus>; name: string; help: string }[] = [
  { key: "token", name: "WHATSAPP_TOKEN", help: "Token permanente de Meta" },
  { key: "phoneId", name: "WHATSAPP_PHONE_ID", help: "Identificador del número de teléfono" },
  { key: "verifyToken", name: "WHATSAPP_VERIFY_TOKEN", help: "Frase que tú inventas y pegas en Meta" },
  { key: "appSecret", name: "WHATSAPP_APP_SECRET", help: "Clave secreta de la app de Meta" },
];

const who: Record<string, string> = { cliente: "Cliente", bot: "Bot", equipo: "Equipo", campana: "Campaña" };

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<{ tel?: string; error?: string }> }) {
  const { tel = "", error = "" } = await searchParams;
  const phone = tel.replace(/\D/g, "").slice(0, 20);
  const env = waEnvStatus();
  const ready = env.token && env.phoneId && env.verifyToken && env.appSecret;
  const dbOk = isDbConfigured();
  const [convs, counts, current, messages] = dbOk
    ? await Promise.all([listConversations(), waCounts(), phone ? getWaContact(phone) : null, phone ? listMessages(phone) : []])
    : [[], { waiting: 0, contacts: 0, optOut: 0 }, null, []];
  const webhook = `${siteConfig.siteUrl.replace(/\/$/, "")}/api/whatsapp`;
  const windowOpen = isWindowOpen(messages);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Bot de WhatsApp</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            El bot contesta solo (compras, publicar en la comunidad, pedidos, envíos y pagos) y te pasa las conversaciones que necesitan a una persona.
          </p>
        </div>
        <Link href="/admin/whatsapp/reactivacion" className={btnPrimary}>Reactivar clientes</Link>
      </header>

      <section className={`${cardCls} p-4 sm:p-6`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl tracking-wide">Conexión con Meta</h2>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {ready ? "Lista" : "Falta configurar"}
          </span>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ENV_ROWS.map((r) => (
            <li key={r.name} className="flex items-start gap-2 text-sm">
              <span aria-hidden="true">{env[r.key] ? "✅" : "⬜"}</span>
              <span>
                <code className="text-xs font-semibold">{r.name}</code>
                <span className="block text-xs text-muted">{r.help}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Dirección del webhook para pegar en Meta (WhatsApp → Configuración → Webhook, campo <b>messages</b>): <code className="select-all rounded bg-paper px-1.5 py-0.5 text-ink">{webhook}</code>
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Esperan a una persona</p>
          <p className={`font-display text-4xl tracking-wide ${counts.waiting > 0 ? "text-accent" : ""}`}>{counts.waiting}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Conversaciones</p>
          <p className="font-display text-4xl tracking-wide">{counts.contacts}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pidieron BAJA</p>
          <p className="font-display text-4xl tracking-wide">{counts.optOut}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <section className={`${cardCls} max-h-[40rem] overflow-y-auto`}>
          {convs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">Todavía no ha escrito nadie.</p>
          ) : (
            <ul className="divide-y divide-line">
              {convs.map((c) => (
                <li key={c.phone}>
                  <Link href={`/admin/whatsapp?tel=${c.phone}`} className={`block px-4 py-3 transition hover:bg-paper ${c.phone === phone ? "bg-paper" : ""}`}>
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{c.name || `+${c.phone}`}</p>
                      {c.needsHuman && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-white">Atender</span>}
                      {c.optOut && <span className="rounded-full bg-line px-2 py-0.5 text-[10px] font-bold uppercase text-muted">Baja</span>}
                      <span className="ml-auto shrink-0 text-[11px] text-muted">{fmtDateTime(c.lastAt)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{c.lastDir === "out" ? "↪ " : ""}{c.lastBody}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardCls} flex min-h-[20rem] flex-col`}>
          {!current ? (
            <p className="m-auto px-5 py-10 text-center text-sm text-muted">Elige una conversación de la lista.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{current.name || "Sin nombre"}</p>
                  <p className="text-xs text-muted">+{current.phone}</p>
                </div>
                {current.handoffNote && <p className="basis-full rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">📌 {current.handoffNote}</p>}
                <form action={returnToBotAction} className="ml-auto">
                  <input type="hidden" name="tel" value={current.phone} />
                  <button type="submit" className={btnGhost}>Devolver al bot</button>
                </form>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" style={{ maxHeight: "28rem" }}>
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.dir === "out" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${m.dir === "out" ? "bg-ink text-white" : "bg-paper"}`}>
                      <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wider ${m.dir === "out" ? "text-white/60" : "text-muted"}`}>{who[m.sender] ?? m.sender} · {fmtDateTime(m.at)}</p>
                      {m.kind === "image" && m.mediaId && (
                        <a href={`/admin/whatsapp/media/${m.mediaId}`} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/admin/whatsapp/media/${m.mediaId}`} alt="Foto del cliente" className="mb-1 max-h-60 rounded-lg" loading="lazy" />
                        </a>
                      )}
                      {m.kind !== "text" && m.kind !== "image" && m.kind !== "template" && (
                        <p className="text-xs italic opacity-80">[{m.kind}]{m.mediaId ? <> <a className="underline" href={`/admin/whatsapp/media/${m.mediaId}`} target="_blank" rel="noreferrer">abrir</a></> : null}</p>
                      )}
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>

              <form action={replyAction} className="border-t border-line p-3">
                <input type="hidden" name="tel" value={current.phone} />
                {error && <p className="mb-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">No se envió: {error}</p>}
                {!windowOpen && <p className="mb-2 text-xs text-amber-700">Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp solo deja enviar plantillas, no texto libre. Espera a que escriba de nuevo.</p>}
                <div className="flex gap-2">
                  <textarea name="texto" rows={2} required maxLength={3000} placeholder="Escribe tu respuesta…" className={inputCls} />
                  <button type="submit" className={btnPrimary}>Enviar</button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
