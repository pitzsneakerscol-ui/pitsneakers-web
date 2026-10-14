import { isDbConfigured } from "@/lib/db";
import { runSync } from "@/lib/seller-sync";
import { notifyInventory } from "@/lib/seller-notify";
import { ensureWeeklyGame } from "@/lib/trivia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tarea programada (Vercel Cron, ver vercel.json): carga en cada cuenta de vendedor los pares del catálogo que llevan su
 * usuario en la columna VENDEDOR y les avisa por correo. Vercel envía "Authorization: Bearer <CRON_SECRET>"; sin esa
 * variable configurada, o con otra clave, no hace nada.
 */
export async function GET(request: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET no está configurada." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  if (!isDbConfigured()) return Response.json({ ok: false, error: "Base de datos sin configurar." }, { status: 503 });

  await ensureWeeklyGame();
  const { added, sellers, waiting, notices } = await runSync();
  let sent = 0;
  let noEmail = 0;
  let failed = 0;
  for (const n of notices) {
    const r = await notifyInventory(n.userId, n.items);
    if (r === "sent") sent++;
    else if (r === "no-email") noEmail++;
    else if (r === "fail") failed++;
  }
  return Response.json({ ok: true, pares: added, vendedores: sellers, esperandoCuenta: waiting.length, correos: { enviados: sent, sinCorreo: noEmail, fallidos: failed } });
}
