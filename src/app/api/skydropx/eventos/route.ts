import { isDbConfigured } from "@/lib/db";
import { getOrderByShipment } from "@/lib/catalog-orders";
import { verifyWebhook, webhookHeaderName } from "@/lib/skydropx";
import { applyTracking } from "@/lib/tracking-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Aviso de Skydropx (Conexiones → Webhooks) cada vez que cambia el recorrido de un envío: recogido, en tránsito, entregado…
 * Se autentica con SKYDROPX_WEBHOOK_SECRET (firma HMAC-SHA512 o token Bearer). Responde 200 a lo que no le toca
 * (otro tipo de evento, envío que no es de un pedido web) para que Skydropx no lo reintente.
 */
export async function POST(request: Request) {
  if (!(process.env.SKYDROPX_WEBHOOK_SECRET ?? "").trim()) {
    return Response.json({ ok: false, error: "SKYDROPX_WEBHOOK_SECRET no está configurada." }, { status: 503 });
  }
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get(webhookHeaderName()))) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  if (!isDbConfigured()) return Response.json({ ok: false, error: "Base de datos sin configurar." }, { status: 503 });

  let body: Json;
  try {
    body = obj(JSON.parse(raw));
  } catch {
    return Response.json({ ok: true, ignorado: "cuerpo no válido" });
  }
  const data = obj(body.data);
  if (str(data.type) !== "packages") return Response.json({ ok: true, ignorado: "no es un evento de envío" });

  const attrs = obj(data.attributes);
  const shipmentId = str(obj(obj(obj(data.relationships).shipment).data).id);
  const tracking = str(attrs.tracking_number);
  const status = str(attrs.status);
  if (!status || (!shipmentId && !tracking)) return Response.json({ ok: true, ignorado: "sin estado o sin envío" });

  const order = await getOrderByShipment(shipmentId, tracking);
  if (!order) return Response.json({ ok: true, ignorado: "envío que no es de un pedido web" });

  try {
    const cambio = await applyTracking(order, status, tracking, str(attrs.label_url));
    return Response.json({ ok: true, pedido: order.reference, estado: status, cambio });
  } catch (e) {
    // 500 para que Skydropx reintente (el cambio es seguro de repetir: no duplica correos).
    return Response.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Error al aplicar el estado." }, { status: 500 });
  }
}
