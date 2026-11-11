import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { botConfig } from "@/config/whatsapp-bot";
import { isWaConfigured, sendTemplate, sendText } from "@/lib/wa-cloud";

// Parte diario de Jarvis por WhatsApp. El asistente lo arma cada mañana y lo entrega en /api/jarvis; aquí se guarda y se le manda al dueño.
// Variables de entorno (Vercel → Settings → Environment Variables):
//   JARVIS_TOKEN        — clave larga que tú inventas; la misma que guardas en Claude para que Jarvis pueda entregar el parte
//   JARVIS_WHATSAPP_TO  — tu WhatsApp personal con código de país y solo dígitos (57311…). No puede ser el número del bot.

const env = (n: string) => (process.env[n] ?? "").trim().replace(/^["']+|["']+$/g, "").trim();

export const jarvisOwner = () => env("JARVIS_WHATSAPP_TO").replace(/\D/g, "");

export const jarvisEnvStatus = () => ({ token: env("JARVIS_TOKEN").length >= 24, owner: jarvisOwner().length >= 10 });

/** Compara la clave que llega en "Authorization: Bearer …" con JARVIS_TOKEN. Sin clave configurada (o muy corta) se rechaza todo. */
export function jarvisAuthorized(header: string | null): boolean {
  const secret = env("JARVIS_TOKEN");
  if (secret.length < 24 || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7).trim());
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const MAX_MESSAGES = 6;
export const MAX_MESSAGE_CHARS = 3500;

/** Revisa lo que manda Jarvis: una fecha AAAA-MM-DD y de 1 a 6 mensajes de texto. */
export function parseParte(input: unknown): { fecha: string; mensajes: string[] } | null {
  if (!input || typeof input !== "object") return null;
  const { fecha, mensajes } = input as { fecha?: unknown; mensajes?: unknown };
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  if (!Array.isArray(mensajes) || mensajes.length < 1 || mensajes.length > MAX_MESSAGES) return null;
  const clean: string[] = [];
  for (const m of mensajes) {
    if (typeof m !== "string") return null;
    const t = m.trim();
    if (!t || t.length > MAX_MESSAGE_CHARS) return null;
    clean.push(t);
  }
  return { fecha, mensajes: clean };
}

export async function saveParte(fecha: string, mensajes: string[]): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO jarvis_partes (fecha, mensajes, created_at) VALUES (?, ?, ?)
          ON CONFLICT(fecha) DO UPDATE SET mensajes = excluded.mensajes, created_at = excluded.created_at`,
    args: [fecha, JSON.stringify(mensajes), Date.now()],
  });
}

async function latestParte(): Promise<{ fecha: string; mensajes: string[] } | null> {
  const db = await getDb();
  const r = await db.execute("SELECT fecha, mensajes FROM jarvis_partes ORDER BY fecha DESC LIMIT 1");
  if (!r.rows[0]) return null;
  try {
    const mensajes = JSON.parse(String(r.rows[0].mensajes)) as unknown;
    if (!Array.isArray(mensajes)) return null;
    return { fecha: String(r.rows[0].fecha), mensajes: mensajes.filter((m): m is string => typeof m === "string") };
  } catch {
    return null;
  }
}

async function sendAll(to: string, mensajes: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const m of mensajes) {
    const r = await sendText(to, m);
    if (!r.ok) return { ok: false, error: r.error };
  }
  return { ok: true };
}

/** WhatsApp solo deja mandar texto libre si el dueño le escribió al bot en las últimas 24 horas. */
async function ownerWindowOpen(owner: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT last_in_at FROM wa_contacts WHERE phone = ?", args: [owner] });
  return Number(r.rows[0]?.last_in_at ?? 0) > Date.now() - 24 * 3_600_000 + 60_000;
}

export type DeliverResult =
  | { enviado: "completo" }
  | { enviado: "aviso" } // se mandó la plantilla; el parte sale cuando el dueño responda VER
  | { enviado: "no"; motivo: string };

/** Manda el parte al dueño: completo si la ventana de 24 h está abierta; si no, la plantilla de aviso. */
export async function deliverParte(mensajes: string[]): Promise<DeliverResult> {
  const owner = jarvisOwner();
  if (owner.length < 10) return { enviado: "no", motivo: "Falta JARVIS_WHATSAPP_TO en Vercel." };
  if (!isWaConfigured()) return { enviado: "no", motivo: "El bot de WhatsApp no está configurado (WHATSAPP_TOKEN y WHATSAPP_PHONE_ID)." };

  if (await ownerWindowOpen(owner)) {
    const r = await sendAll(owner, mensajes);
    return r.ok ? { enviado: "completo" } : { enviado: "no", motivo: r.error };
  }
  const t = await sendTemplate(owner, botConfig.templates.jarvis, botConfig.templates.language, []);
  return t.ok ? { enviado: "aviso" } : { enviado: "no", motivo: `No se pudo mandar la plantilla "${botConfig.templates.jarvis}": ${t.error}` };
}

const COMMAND = /^(ver|jarvis|parte|resumen)( (de|del) (hoy|d[ií]a))?[\s.!]*$/i;

/**
 * Si quien escribe es el dueño y pide el parte ("ver", "resumen de hoy", "parte", "jarvis"), se lo manda y devuelve true.
 * Cualquier otro mensaje (o de otro número) devuelve false y lo atiende el bot como siempre.
 */
export async function handleOwnerCommand(phone: string, text: string): Promise<boolean> {
  const owner = jarvisOwner();
  if (owner.length < 10 || phone !== owner || !COMMAND.test(text.trim())) return false;
  const parte = await latestParte();
  if (!parte || parte.mensajes.length === 0) {
    await sendText(owner, "Todavía no tengo un parte guardado. El de hoy llega a las 9:12 a. m.");
    return true;
  }
  const r = await sendAll(owner, parte.mensajes);
  if (!r.ok) console.error("Jarvis: no se pudo mandar el parte", r.error);
  return true;
}
