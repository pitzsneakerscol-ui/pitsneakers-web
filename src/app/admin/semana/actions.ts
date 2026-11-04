"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getWeeklyReport, weeklyEmail } from "@/lib/weekly";
import { siteConfig } from "@/config/site";

/** Manda el resumen de la semana ahora mismo al correo del dueño (para probarlo o verlo antes del lunes). */
export async function sendWeeklyNow(): Promise<void> {
  await requireAdmin();
  const to = (process.env.WEEKLY_REPORT_TO ?? "").trim() || siteConfig.contactEmail;
  const mail = weeklyEmail(await getWeeklyReport());
  const res = await sendEmail({ to, subject: mail.subject, body: mail.body }).catch(() => ({ ok: false as const, error: "Fallo de red." }));
  redirect(`/admin/semana?${res.ok ? `ok=${encodeURIComponent(to)}` : `e=${encodeURIComponent(res.error)}`}`);
}
