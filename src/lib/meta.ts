import { createHash } from "node:crypto";

/**
 * API de Conversiones de Meta (desde el servidor). Complementa al píxel: las compras llegan aunque el navegador
 * bloquee el píxel o la persona cierre la página antes de volver al sitio.
 * Necesita NEXT_PUBLIC_META_PIXEL_ID y META_CAPI_TOKEN (en Vercel). Si falta alguno, no hace nada.
 * META_TEST_EVENT_CODE (opcional): código de "Eventos de prueba" del Administrador de eventos, solo para verificar.
 */
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

export function metaCapiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CAPI_TOKEN);
}

/** Meta pide los datos personales en minúsculas y con hash SHA-256: nunca viajan en claro. */
const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export interface MetaUser {
  email?: string;
  /** Celular colombiano de 10 dígitos (3001234567); se envía con el 57 por delante. */
  phone?: string;
  name?: string;
  city?: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}

function userData(u: MetaUser): Record<string, unknown> {
  const out: Record<string, unknown> = { country: [sha("co")] };
  if (u.email) out.em = [sha(u.email)];
  const digits = (u.phone ?? "").replace(/\D/g, "");
  if (digits) out.ph = [sha(/^3\d{9}$/.test(digits) ? `57${digits}` : digits)];
  const parts = (u.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts[0]) out.fn = [sha(parts[0])];
  if (parts.length > 1) out.ln = [sha(parts[parts.length - 1])];
  const city = (u.city ?? "").toLowerCase().replace(/[^\p{L}]/gu, "");
  if (city) out.ct = [sha(city)];
  if (u.ip && u.ip !== "desconocida") out.client_ip_address = u.ip;
  if (u.userAgent) out.client_user_agent = u.userAgent;
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  return out;
}

/**
 * Manda un evento a Meta. Nunca lanza error: si Meta no responde, el pedido o el registro siguen su curso.
 * `id` debe ser el mismo `eventID` que usa el píxel en el navegador para que Meta no cuente el evento dos veces.
 */
export async function sendMetaEvent(ev: { name: string; id: string; url?: string; user: MetaUser; custom?: Record<string, unknown> }): Promise<void> {
  if (!metaCapiConfigured()) return;
  try {
    const body: Record<string, unknown> = {
      data: [
        {
          event_name: ev.name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: ev.id,
          action_source: "website",
          ...(ev.url ? { event_source_url: ev.url } : {}),
          user_data: userData(ev.user),
          ...(ev.custom ? { custom_data: ev.custom } : {}),
        },
      ],
    };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.NEXT_PUBLIC_META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN ?? "")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[meta] la API de Conversiones respondió", res.status, (await res.text()).slice(0, 300));
  } catch (e) {
    console.error("[meta] no se pudo enviar el evento:", e instanceof Error ? e.message : e);
  }
}
