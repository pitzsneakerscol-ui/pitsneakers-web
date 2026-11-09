import type { Metadata } from "next";
import Link from "next/link";
import { botConfig } from "@/config/whatsapp-bot";
import { cleanCampaign } from "@/lib/campaigns";
import { isDbConfigured } from "@/lib/db";
import { isWaConfigured } from "@/lib/wa-cloud";
import { broadcastSummaries, isSegment, previewBroadcast, SEGMENTS, type Segment } from "@/lib/wa-broadcast";
import { ago, fmtDateTime } from "@/lib/admin-shared";
import { btnGhost, btnPrimary, cardCls, inputCls, labelCls, selectAutoCls } from "@/components/reseller/ui";
import { broadcastAction } from "../actions";

export const metadata: Metadata = { title: "Reactivar clientes por WhatsApp" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const month = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(0, 7);

export default async function ReactivacionPage({ searchParams }: { searchParams: Promise<{ s?: string; d?: string; c?: string; ok?: string; error?: string }> }) {
  const q = await searchParams;
  const segment: Segment = q.s && isSegment(q.s) ? q.s : "compradores";
  const days = Math.min(720, Math.max(14, Math.round(Number(q.d)) || 60));
  const campaign = cleanCampaign(q.c ?? "") || `${segment}-${month()}`;
  const configured = isWaConfigured();
  const [preview, summaries] = isDbConfigured() ? await Promise.all([previewBroadcast(segment, days, campaign), broadcastSummaries()]) : [null, []];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Reactivar clientes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Escríbeles por WhatsApp a los compradores que dejaron de comprar y a los vendedores que dejaron de publicar. Va con una plantilla aprobada por Meta, y quien responda <b>BAJA</b> no vuelve a recibir nada.
          </p>
        </div>
        <Link href="/admin/whatsapp" className={btnGhost}>← Bot de WhatsApp</Link>
      </header>

      {q.ok && <p className="rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-900">✅ {q.ok}</p>}
      {q.error && <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">{q.error}</p>}

      <section className={`${cardCls} p-4 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">1. ¿A quién?</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end" method="get">
          <div>
            <label className={labelCls} htmlFor="s">Lista</label>
            <select id="s" name="s" defaultValue={segment} className={`${selectAutoCls} w-full`}>
              {(Object.keys(SEGMENTS) as Segment[]).map((k) => (
                <option key={k} value={k}>{SEGMENTS[k].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="d">Días sin actividad</label>
            <input id="d" name="d" type="number" min={14} max={720} defaultValue={days} className={inputCls} />
          </div>
          <button type="submit" className={btnGhost}>Ver lista</button>
        </form>
        <p className="mt-2 text-xs text-muted">{SEGMENTS[segment].help.replace("N", String(days))}</p>

        {preview && (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-line p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Les llegaría</p>
              <p className="font-display text-3xl text-accent">{preview.eligible.length}</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pidieron BAJA</p>
              <p className="font-display text-3xl">{preview.optOut}</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Ya se les escribió</p>
              <p className="font-display text-3xl">{preview.alreadySent}</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sin celular válido</p>
              <p className="font-display text-3xl">{preview.noPhone}</p>
            </div>
          </div>
        )}
        {preview && preview.eligible.length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line text-sm">
            {preview.eligible.slice(0, 8).map((c) => (
              <li key={c.phone} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate">{c.name || "Sin nombre"} <span className="text-muted">· +{c.phone}</span></span>
                <span className="shrink-0 text-xs text-muted">{c.lastAt ? ago(c.lastAt) : "nunca"}</span>
              </li>
            ))}
            {preview.eligible.length > 8 && <li className="px-3 py-2 text-xs text-muted">… y {preview.eligible.length - 8} más</li>}
          </ul>
        )}
      </section>

      <section className={`${cardCls} p-4 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">2. Plantilla en Meta</h2>
        <p className="mt-1 text-sm text-muted">
          Antes de enviar, crea esta plantilla en <b>Meta Business → WhatsApp Manager → Plantillas de mensajes</b> (categoría <b>Marketing</b>, idioma <b>Español</b>) con el nombre exacto de abajo y espera a que la aprueben.
        </p>
        <div className="mt-3 rounded-lg border border-line bg-paper p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Nombre: <code className="text-ink">{botConfig.templates[segment]}</code></p>
          <p className="mt-2 whitespace-pre-wrap">{botConfig.templateDrafts[segment]}</p>
        </div>
        <p className="mt-2 text-xs text-muted">El texto se cambia en <code>src/config/whatsapp-bot.ts</code>. Cada mensaje de marketing lo cobra Meta por conversación.</p>
      </section>

      <section className={`${cardCls} p-4 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">3. Enviar</h2>
        {!configured && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">WhatsApp todavía no está configurado en Vercel (falta WHATSAPP_TOKEN y WHATSAPP_PHONE_ID). No se puede enviar.</p>}
        <form action={broadcastAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="segmento" value={segment} />
          <input type="hidden" name="dias" value={days} />
          <div>
            <label className={labelCls} htmlFor="campana">Nombre de la campaña (evita repetir envíos)</label>
            <input id="campana" name="campana" defaultValue={campaign} maxLength={40} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cantidad">Cuántos en esta tanda (máx. 100)</label>
            <input id="cantidad" name="cantidad" type="number" min={1} max={100} defaultValue={Math.min(25, preview?.eligible.length ?? 25)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="confirmo">Escribe ENVIAR para confirmar</label>
            <input id="confirmo" name="confirmo" autoComplete="off" placeholder="ENVIAR" className={inputCls} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={!configured || !preview || preview.eligible.length === 0} className={btnPrimary}>Enviar a la primera tanda</button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted">Empieza con una tanda pequeña (25) para ver cómo responden y que Meta vea buena calidad antes de subir el volumen. Los que ya recibieron esta campaña no se repiten.</p>
      </section>

      {summaries.length > 0 && (
        <section className={`${cardCls} overflow-x-auto p-4 sm:p-6`}>
          <h2 className="font-display text-2xl tracking-wide">Campañas enviadas</h2>
          <table className="mt-3 w-full min-w-[26rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted">
              <tr><th className="py-2 pr-3 font-semibold">Campaña</th><th className="px-3 py-2 font-semibold">Enviados</th><th className="px-3 py-2 font-semibold">Fallidos</th><th className="px-3 py-2 font-semibold">Último</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {summaries.map((s) => (
                <tr key={s.campaign}><td className="py-2 pr-3 font-semibold">{s.campaign}</td><td className="px-3 py-2">{s.sent}</td><td className="px-3 py-2">{s.failed}</td><td className="px-3 py-2 text-muted">{fmtDateTime(s.last)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
