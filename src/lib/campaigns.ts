import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { missingVars, renderEmailHtml, renderEmailText, renderTemplate, siteVars, type Vars } from "@/lib/email-templates";
import { siteConfig } from "@/config/site";

export const newToken = () => randomBytes(18).toString("base64url");

export const siteBase = () => siteConfig.siteUrl.replace(/\/$/, "");
/** Enlace que va en el cuerpo del correo (pide confirmar) y enlace de un clic para el botón "Cancelar suscripción" de Gmail. */
export const unsubPageUrl = (token: string) => `${siteBase()}/baja/${token}`;
export const unsubApiUrl = (token: string) => `${siteBase()}/api/baja/${token}`;

/** Los contactos importados antes de existir los enlaces de baja no tienen código: se les genera aquí. */
export async function ensureTokens(): Promise<void> {
  const db = await getDb();
  const r = await db.execute("SELECT id FROM marketing_contacts WHERE token = ''");
  for (let i = 0; i < r.rows.length; i += 200) {
    await db.batch(
      r.rows.slice(i, i + 200).map((x) => ({ sql: "UPDATE marketing_contacts SET token = ? WHERE id = ? AND token = ''", args: [newToken(), Number(x.id)] })),
      "write",
    );
  }
}

export async function unsubscribeByToken(token: string): Promise<{ found: boolean; already: boolean }> {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return { found: false, already: false };
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT id, unsubscribed FROM marketing_contacts WHERE token = ?", args: [token] });
  if (!r.rows[0]) return { found: false, already: false };
  const already = Number(r.rows[0].unsubscribed) === 1;
  if (!already) await db.execute({ sql: "UPDATE marketing_contacts SET unsubscribed = 1 WHERE id = ?", args: [Number(r.rows[0].id)] });
  return { found: true, already };
}

export async function isTokenUnsubscribed(token: string): Promise<boolean | null> {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT unsubscribed FROM marketing_contacts WHERE token = ?", args: [token] });
  return r.rows[0] ? Number(r.rows[0].unsubscribed) === 1 : null;
}

/* ---------- Armado de cada correo ---------- */

export interface CampaignMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  token: string;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** Variables sin llenar en el asunto o el mensaje (ej. {{monto}}): se revisan antes de enviar nada. */
export function campaignMissingVars(subject: string, body: string): string[] {
  const vars: Vars = { ...siteVars(), nombre: "parcero" };
  return [...new Set([...missingVars(renderTemplate(subject, vars)), ...missingVars(renderTemplate(body, vars))])];
}

export function buildMail(subject: string, body: string, c: { email: string; name: string; token: string }, preview = false): CampaignMail {
  const vars: Vars = { ...siteVars(), nombre: firstName(c.name) || "parcero" };
  const s = renderTemplate(subject, vars);
  const b = renderTemplate(body, vars);
  const url = unsubPageUrl(c.token);
  return {
    to: c.email,
    subject: preview ? `[PRUEBA] ${s}` : s,
    html: renderEmailHtml(s, b, { unsubscribeUrl: url }),
    text: `${renderEmailText(b)}\n\n—\nSi ya no quieres recibir estos correos, date de baja aquí: ${url}`,
    token: c.token,
  };
}

/* ---------- Envío por lotes (Resend /emails/batch: hasta 100 correos por llamada) ---------- */

/** `rejected`: Resend rechazó el contenido o una dirección (400/422); reintentar igual no sirve. Otros fallos (red, límite, 5xx) sí se pueden reintentar. */
export type BatchResult = { ok: true } | { ok: false; error: string; rejected: boolean };

/** Resend solo acepta direcciones con caracteres ASCII (sin tildes ni ñ). */
export const isSendableEmail = (e: string) => /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(e) && e.length <= 120;

export async function sendBatch(mails: CampaignMail[]): Promise<BatchResult> {
  if (!isEmailConfigured()) return { ok: false, error: "Correo no configurado.", rejected: false };
  const single = process.env.RESEND_API_URL || "https://api.resend.com/emails";
  const replyTo = process.env.EMAIL_REPLY_TO;
  try {
    const res = await fetch(`${single.replace(/\/$/, "")}/batch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        mails.map((m) => ({
          from: process.env.EMAIL_FROM,
          to: [m.to],
          subject: m.subject,
          html: m.html,
          text: m.text,
          headers: {
            // Gmail y Yahoo muestran "Cancelar suscripción" con esto; exigen que sea de un clic.
            "List-Unsubscribe": `<${unsubApiUrl(m.token)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          ...(replyTo ? { reply_to: replyTo } : {}),
        })),
      ),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, error: (data?.message ?? `Error ${res.status}`).slice(0, 200), rejected: res.status === 400 || res.status === 422 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Fallo de red.", rejected: false };
  }
}

type Outcome = { ok: true } | { ok: false; error: string; rejected: boolean };

/**
 * Resend rechaza el lote entero si una sola dirección es inválida. Si pasa, se parte el lote a la mitad
 * hasta aislar la dirección mala: las demás salen y solo la culpable queda marcada.
 */
export async function sendIsolating(mails: CampaignMail[]): Promise<Outcome[]> {
  const r = await sendBatch(mails);
  if (r.ok) return mails.map(() => ({ ok: true }) as Outcome);
  if (!r.rejected || mails.length === 1) return mails.map(() => r);
  const mid = Math.ceil(mails.length / 2);
  return [...(await sendIsolating(mails.slice(0, mid))), ...(await sendIsolating(mails.slice(mid)))];
}

/* ---------- Campañas ---------- */

export const BATCH_SIZE = 100;
export const MAX_PER_SEND = 500;

export const cleanCampaign = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export interface CampaignSummary {
  campaign: string;
  sent: number;
  failed: number;
  sending: number;
  last: number;
}

export async function campaignSummaries(): Promise<CampaignSummary[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT campaign,
            SUM(CASE WHEN status = 'enviado' THEN 1 ELSE 0 END) AS sent,
            SUM(CASE WHEN status = 'fallido' THEN 1 ELSE 0 END) AS failed,
            SUM(CASE WHEN status = 'enviando' THEN 1 ELSE 0 END) AS sending,
            MAX(sent_at) AS last
     FROM marketing_sends GROUP BY campaign ORDER BY last DESC LIMIT 12`,
  );
  return r.rows.map((x) => ({ campaign: String(x.campaign), sent: Number(x.sent), failed: Number(x.failed), sending: Number(x.sending), last: Number(x.last) }));
}

/** Contactos activos que todavía no recibieron esta campaña (los que fallaron se pueden reintentar). */
export async function pendingCount(campaign: string): Promise<number> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM marketing_contacts c
          LEFT JOIN marketing_sends s ON s.contact_id = c.id AND s.campaign = ?
          WHERE c.unsubscribed = 0 AND (s.contact_id IS NULL OR s.status = 'fallido')`,
    args: [campaign],
  });
  return Number(r.rows[0].n);
}

export interface SendReport {
  claimed: number;
  sent: number;
  failed: number;
  /** Direcciones que Resend no acepta; se apartan y no se reintentan. */
  invalid: number;
  firstError: string;
}

/**
 * Envía la campaña a hasta `limit` contactos pendientes. Antes de enviar "reserva" a cada uno en marketing_sends
 * (estado "enviando"): si se pulsa el botón dos veces o se corta la conexión, nadie recibe el mismo correo dos veces.
 */
export async function sendCampaign(campaign: string, subject: string, body: string, limit: number): Promise<SendReport> {
  const db = await getDb();
  await ensureTokens();
  const run = newToken();
  const now = Date.now();

  const pick = await db.execute({
    sql: `SELECT c.id FROM marketing_contacts c
          LEFT JOIN marketing_sends s ON s.contact_id = c.id AND s.campaign = ?
          WHERE c.unsubscribed = 0 AND (s.contact_id IS NULL OR s.status = 'fallido')
          ORDER BY c.id LIMIT ?`,
    args: [campaign, limit],
  });
  const ids = pick.rows.map((r) => Number(r.id));
  for (let i = 0; i < ids.length; i += 200) {
    await db.batch(
      ids.slice(i, i + 200).map((id) => ({
        sql: `INSERT INTO marketing_sends (campaign, contact_id, status, run, sent_at) VALUES (?, ?, 'enviando', ?, ?)
              ON CONFLICT(campaign, contact_id) DO UPDATE SET status = 'enviando', error = '', run = excluded.run, sent_at = excluded.sent_at WHERE marketing_sends.status = 'fallido'`,
        args: [campaign, id, run, now],
      })),
      "write",
    );
  }

  // Solo los que realmente reservó esta ejecución.
  const mine = await db.execute({
    sql: `SELECT c.id, c.email, c.name, c.token FROM marketing_sends s JOIN marketing_contacts c ON c.id = s.contact_id
          WHERE s.campaign = ? AND s.run = ? AND s.status = 'enviando' AND c.unsubscribed = 0 ORDER BY c.id`,
    args: [campaign, run],
  });
  const rows = mine.rows.map((r) => ({ id: Number(r.id), email: String(r.email), name: String(r.name), token: String(r.token) }));

  let sent = 0;
  let failed = 0;
  let invalid = 0;
  let firstError = "";
  const mark = (c: { id: number }, status: string, error: string) =>
    ({ sql: "UPDATE marketing_sends SET status = ?, error = ?, sent_at = ? WHERE campaign = ? AND contact_id = ?", args: [status, error, Date.now(), campaign, c.id] });

  // Las direcciones con tildes, ñ u otros caracteres raros no se pueden enviar: se apartan y no se reintentan.
  const bad = rows.filter((c) => !isSendableEmail(c.email));
  const good = rows.filter((c) => isSendableEmail(c.email));
  if (bad.length) {
    await db.batch(bad.map((c) => mark(c, "invalido", "Correo con caracteres no válidos")), "write");
    invalid += bad.length;
  }

  for (let i = 0; i < good.length; i += BATCH_SIZE) {
    const chunk = good.slice(i, i + BATCH_SIZE);
    const outcomes = await sendIsolating(chunk.map((c) => buildMail(subject, body, c)));
    await db.batch(
      chunk.map((c, j) => {
        const o = outcomes[j];
        if (o.ok) return mark(c, "enviado", "");
        return mark(c, o.rejected ? "invalido" : "fallido", o.error);
      }),
      "write",
    );
    outcomes.forEach((o) => {
      if (o.ok) sent++;
      else if (o.rejected) invalid++;
      else failed++;
      if (!o.ok) firstError ||= o.error;
    });
  }
  return { claimed: rows.length, sent, failed, invalid, firstError };
}
