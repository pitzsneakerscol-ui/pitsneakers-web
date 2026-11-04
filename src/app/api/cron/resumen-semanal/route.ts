import { isDbConfigured, getDb } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { rateLimitHit } from "@/lib/auth";
import { getWeeklyReport, weeklyEmail } from "@/lib/weekly";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KEY = "resumen-semanal";

/**
 * Tarea programada (Vercel Cron, ver vercel.json): cada lunes manda al dueño el resumen de la semana por correo.
 * Vercel envía "Authorization: Bearer <CRON_SECRET>"; sin esa variable, o con otra clave, no hace nada.
 * Llega a WEEKLY_REPORT_TO si existe; si no, al correo de contacto del sitio. Una segunda llamada en la misma semana no repite el envío.
 */
export async function GET(request: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET no está configurada." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  if (!isDbConfigured()) return Response.json({ ok: false, error: "Base de datos sin configurar." }, { status: 503 });
  if (!isEmailConfigured()) return Response.json({ ok: false, error: "Correo sin configurar (RESEND_API_KEY y EMAIL_FROM)." }, { status: 503 });

  // Una vez por semana: si Vercel repite la llamada, no se manda dos veces.
  if (!(await rateLimitHit(KEY, 1, 5 * 24 * 3_600_000))) return Response.json({ ok: true, enviado: false, motivo: "Ya se envió esta semana." });

  const to = (process.env.WEEKLY_REPORT_TO ?? "").trim() || siteConfig.contactEmail;
  try {
    const mail = weeklyEmail(await getWeeklyReport());
    const res = await sendEmail({ to, subject: mail.subject, body: mail.body });
    if (!res.ok) throw new Error(res.error);
    return Response.json({ ok: true, enviado: true, a: to });
  } catch (e) {
    // Si falló, se libera el cupo para que el siguiente intento sí pueda enviarlo.
    const db = await getDb();
    await db.execute({ sql: "DELETE FROM rate_limits WHERE key = ?", args: [KEY] });
    return Response.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "No se pudo enviar el resumen." }, { status: 500 });
  }
}
