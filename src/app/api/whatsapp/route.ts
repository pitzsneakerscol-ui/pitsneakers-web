import { after } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { verifySignature, verifyTokenValue } from "@/lib/wa-cloud";
import { handleWebhook, type WaPayload } from "@/lib/wa-bot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Webhook del bot de WhatsApp. En Meta (WhatsApp → Configuración → Webhook) pega esta dirección:
 *   https://pitsneakers.com/api/whatsapp
 * y como "Token de verificación" el mismo valor de WHATSAPP_VERIFY_TOKEN. Suscríbete al campo "messages".
 */

/** Meta llama aquí una sola vez para comprobar que la dirección es tuya. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const expected = verifyTokenValue();
  if (url.searchParams.get("hub.mode") === "subscribe" && expected && url.searchParams.get("hub.verify_token") === expected) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("prohibido", { status: 403 });
}

/** Cada mensaje de un cliente llega aquí. Se responde 200 enseguida y se atiende después (Meta reintenta si tarda). */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("firma-invalida", { status: 401 });
  if (!isDbConfigured()) return new Response("no-disponible", { status: 503 });

  let payload: WaPayload;
  try {
    payload = JSON.parse(raw) as WaPayload;
  } catch {
    return new Response("json-invalido", { status: 400 });
  }
  after(() => handleWebhook(payload));
  return new Response("ok", { status: 200 });
}
