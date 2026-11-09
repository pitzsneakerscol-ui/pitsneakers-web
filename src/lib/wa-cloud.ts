import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cliente de la API oficial de WhatsApp (Meta WhatsApp Cloud API). Variables de entorno (Vercel → Settings → Environment Variables):
//   WHATSAPP_TOKEN          — token permanente del usuario del sistema (Meta Business → Usuarios del sistema)
//   WHATSAPP_PHONE_ID       — "Identificador del número de teléfono" (WhatsApp → API Setup)
//   WHATSAPP_VERIFY_TOKEN   — una frase cualquiera que tú inventas; la misma que pegas en Meta al configurar el webhook
//   WHATSAPP_APP_SECRET     — "Clave secreta de la app" (Configuración de la app → Básica); con ella se comprueba que cada aviso viene de Meta
//   WHATSAPP_API_VERSION    — (opcional) versión de la API, por defecto v21.0
//   WHATSAPP_API_BASE       — (opcional, solo para pruebas) dirección de la API, por defecto https://graph.facebook.com

const env = (n: string) => (process.env[n] ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
const VERSION = () => env("WHATSAPP_API_VERSION") || "v21.0";
const BASE = () => (env("WHATSAPP_API_BASE") || "https://graph.facebook.com").replace(/\/$/, "");

export const waEnvStatus = () => ({
  token: Boolean(env("WHATSAPP_TOKEN")),
  phoneId: Boolean(env("WHATSAPP_PHONE_ID")),
  verifyToken: Boolean(env("WHATSAPP_VERIFY_TOKEN")),
  appSecret: Boolean(env("WHATSAPP_APP_SECRET")),
});

export const isWaConfigured = () => {
  const s = waEnvStatus();
  return s.token && s.phoneId;
};

export const verifyTokenValue = () => env("WHATSAPP_VERIFY_TOKEN");

/** Comprueba la firma que Meta pone en cada aviso (X-Hub-Signature-256). Sin la clave secreta configurada se rechaza todo. */
export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = env("WHATSAPP_APP_SECRET");
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string; code?: number };

async function post(body: Record<string, unknown>): Promise<SendResult> {
  if (!isWaConfigured()) return { ok: false, error: "WhatsApp no está configurado." };
  try {
    const res = await fetch(`${BASE()}/${VERSION()}/${env("WHATSAPP_PHONE_ID")}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json().catch(() => null)) as { messages?: { id: string }[]; error?: { message?: string; code?: number } } | null;
    if (res.ok && data?.messages?.[0]?.id) return { ok: true, id: data.messages[0].id };
    return { ok: false, error: (data?.error?.message ?? `Error ${res.status}`).slice(0, 300), code: data?.error?.code };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Fallo de red." };
  }
}

/** Texto libre: solo funciona dentro de las 24 horas siguientes al último mensaje del cliente. */
export const sendText = (to: string, body: string) => post({ to, type: "text", text: { body: body.slice(0, 4000), preview_url: true } });

/** Plantilla aprobada por Meta: es la única forma de escribirle primero a alguien (o pasadas 24 horas). */
export const sendTemplate = (to: string, name: string, language: string, params: string[]) =>
  post({
    to,
    type: "template",
    template: {
      name,
      language: { code: language },
      ...(params.length ? { components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] } : {}),
    },
  });

/** Marca el mensaje como leído (palomitas azules). No pasa nada si falla. */
export async function markRead(waId: string): Promise<void> {
  await post({ status: "read", message_id: waId }).catch(() => null);
}

/** Descarga una foto o archivo que mandó el cliente (se pide la dirección y luego el archivo, ambos con el token). */
export async function fetchMedia(mediaId: string): Promise<{ mime: string; data: ArrayBuffer } | null> {
  if (!isWaConfigured() || !/^\d{5,30}$/.test(mediaId)) return null;
  try {
    const meta = await fetch(`${BASE()}/${VERSION()}/${mediaId}`, {
      headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!meta.ok) return null;
    const info = (await meta.json()) as { url?: string; mime_type?: string };
    if (!info.url) return null;
    const file = await fetch(info.url, { headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}` }, signal: AbortSignal.timeout(20000) });
    if (!file.ok) return null;
    return { mime: info.mime_type || "application/octet-stream", data: await file.arrayBuffer() };
  } catch {
    return null;
  }
}
