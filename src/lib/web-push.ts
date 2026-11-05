import "server-only";
import webpush from "web-push";
import { getDb } from "@/lib/db";
import { siteConfig } from "@/config/site";

/**
 * Avisos del navegador (Web Push) para los revendedores que usan la página y no la app.
 * Variables de entorno (sin ellas no se envía nada y el botón de activar no aparece):
 *  WEBPUSH_PUBLIC_KEY   llave pública VAPID (la ve el navegador).
 *  WEBPUSH_PRIVATE_KEY  llave privada VAPID (secreta, solo en Vercel).
 *  WEBPUSH_SUBJECT      (opcional) "mailto:..." de contacto; por defecto el correo del sitio.
 * Se generan una sola vez con:  npx web-push generate-vapid-keys
 */

export interface WebPushMessage {
  title: string;
  body: string;
  /** Ruta interna que se abre al tocar el aviso. */
  url?: string;
}

const env = (k: string) => (process.env[k] ?? "").trim();

export const webPushPublicKey = () => env("WEBPUSH_PUBLIC_KEY");
export const isWebPushConfigured = () => Boolean(env("WEBPUSH_PUBLIC_KEY") && env("WEBPUSH_PRIVATE_KEY"));

/**
 * El servidor hace una llamada a la dirección ("endpoint") que trae cada navegador, así que solo se aceptan
 * los servicios de avisos de los navegadores conocidos (Chrome/Edge, Firefox, Safari y Windows). Evita que alguien apunte a otro sitio.
 */
const PUSH_HOSTS = [/^(fcm|android)\.googleapis\.com$/,/(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
export function isAllowedEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && !u.username && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/** Máximo de navegadores por revendedor (si activa más, se descartan los más viejos). */
export const MAX_SUBS_PER_USER = 8;

let ready = false;
function setup(): boolean {
  if (ready) return true;
  if (!isWebPushConfigured()) return false;
  try {
    webpush.setVapidDetails(env("WEBPUSH_SUBJECT") || `mailto:${siteConfig.contactEmail}`, env("WEBPUSH_PUBLIC_KEY"), env("WEBPUSH_PRIVATE_KEY"));
    ready = true;
  } catch (e) {
    console.error("[web-push] llaves VAPID no válidas:", e);
  }
  return ready;
}

/** Guarda (o reasigna a este usuario) el navegador que activó los avisos. */
export async function saveSubscription(userId: number, sub: { endpoint: string; p256dh: string; auth: string }): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO web_push_subs (endpoint, user_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [sub.endpoint, userId, sub.p256dh, sub.auth, Date.now()],
  });
  await db.execute({
    sql: `DELETE FROM web_push_subs WHERE user_id = ? AND endpoint NOT IN
            (SELECT endpoint FROM web_push_subs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?)`,
    args: [userId, userId, MAX_SUBS_PER_USER],
  });
}

export async function removeSubscription(userId: number, endpoint: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM web_push_subs WHERE endpoint = ? AND user_id = ?", args: [endpoint, userId] });
}

/**
 * Manda un aviso a todos los navegadores activados de un revendedor.
 * Nunca lanza error: el aviso es un extra y no debe romper la acción que lo origina.
 * Los navegadores que ya no existen (404/410) se borran solos.
 */
export async function sendWebPush(userId: number, msg: WebPushMessage): Promise<{ sent: number; failed: number; removed: number }> {
  const zero = { sent: 0, failed: 0, removed: 0 };
  if (!setup()) return zero;
  const title = msg.title.trim().slice(0, 80);
  const body = msg.body.trim().slice(0, 180);
  if (!title || !body) return zero;
  const url = msg.url && msg.url.startsWith("/") && !msg.url.startsWith("//") ? msg.url : "/revendedores/avisos";

  try {
    const db = await getDb();
    const r = await db.execute({ sql: "SELECT endpoint, p256dh, auth FROM web_push_subs WHERE user_id = ?", args: [userId] });
    if (r.rows.length === 0) return zero;
    const payload = JSON.stringify({ title, body, url });
    const outcomes = await Promise.all(
      r.rows.map(async (row): Promise<"sent" | "failed" | "dead"> => {
        try {
          await webpush.sendNotification(
            { endpoint: String(row.endpoint), keys: { p256dh: String(row.p256dh), auth: String(row.auth) } },
            payload,
            { TTL: 24 * 3600, urgency: "high", timeout: 10000 }
          );
          return "sent";
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          return status === 404 || status === 410 ? "dead" : "failed";
        }
      })
    );
    const dead = r.rows.filter((_, i) => outcomes[i] === "dead").map((row) => String(row.endpoint));
    if (dead.length) {
      await db.batch(dead.map((endpoint) => ({ sql: "DELETE FROM web_push_subs WHERE endpoint = ?", args: [endpoint] })), "write").catch(() => undefined);
    }
    return { sent: outcomes.filter((o) => o === "sent").length, failed: outcomes.filter((o) => o === "failed").length, removed: dead.length };
  } catch (e) {
    console.error("[web-push] no se pudo enviar:", e);
    return zero;
  }
}
