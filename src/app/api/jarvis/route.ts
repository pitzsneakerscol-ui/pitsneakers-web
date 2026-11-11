import { isDbConfigured } from "@/lib/db";
import { deliverParte, jarvisAuthorized, jarvisEnvStatus, parseParte, saveParte } from "@/lib/jarvis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Entrega del parte diario de Jarvis. El asistente llama aquí cada mañana con "Authorization: Bearer <JARVIS_TOKEN>" y
 *   { "fecha": "AAAA-MM-DD", "mensajes": ["…", "…"] }
 * El parte se guarda y se le manda al dueño por WhatsApp (JARVIS_WHATSAPP_TO). Si WhatsApp no deja escribirle texto libre
 * (pasaron más de 24 h desde su último mensaje al bot), se manda la plantilla de aviso y el parte sale cuando responda VER.
 */
export async function POST(request: Request) {
  if (!jarvisEnvStatus().token) return Response.json({ ok: false, error: "JARVIS_TOKEN no está configurada." }, { status: 503 });
  if (!jarvisAuthorized(request.headers.get("authorization"))) return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  if (!isDbConfigured()) return Response.json({ ok: false, error: "Base de datos sin configurar." }, { status: 503 });

  const parte = parseParte(await request.json().catch(() => null));
  if (!parte) return Response.json({ ok: false, error: "Formato inválido: se espera fecha AAAA-MM-DD y de 1 a 6 mensajes de máximo 3500 caracteres." }, { status: 400 });

  try {
    await saveParte(parte.fecha, parte.mensajes);
    const r = await deliverParte(parte.mensajes);
    return Response.json({ ok: true, guardado: true, ...r });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "No se pudo guardar el parte." }, { status: 500 });
  }
}
