"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cleanCampaign } from "@/lib/campaigns";
import { isWaConfigured } from "@/lib/wa-cloud";
import { getWaContact, replyText, returnToBot } from "@/lib/wa-bot";
import { isSegment, runBroadcast } from "@/lib/wa-broadcast";

const phoneOf = (fd: FormData) => String(fd.get("tel") ?? "").replace(/\D/g, "").slice(0, 20);

/** El equipo contesta desde el panel. Solo funciona dentro de las 24 horas del último mensaje del cliente (regla de WhatsApp). */
export async function replyAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const phone = phoneOf(fd);
  const body = String(fd.get("texto") ?? "").trim().slice(0, 3000);
  if (!phone || !body) redirect(`/admin/whatsapp?tel=${phone}`);
  const c = await getWaContact(phone);
  if (!c) redirect("/admin/whatsapp");
  const r = await replyText(phone, body, "equipo");
  // Mientras el equipo conversa, el bot sigue callado.
  if (r.ok) {
    const db = await getDb();
    await db.execute({ sql: "UPDATE wa_contacts SET human_until = ?, needs_human = 0 WHERE phone = ?", args: [Date.now() + 12 * 3_600_000, phone] });
  }
  revalidatePath("/admin/whatsapp");
  redirect(`/admin/whatsapp?tel=${phone}${r.ok ? "" : `&error=${encodeURIComponent(r.error.slice(0, 160))}`}`);
}

/** Devuelve la conversación al bot. */
export async function returnToBotAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const phone = phoneOf(fd);
  if (phone) await returnToBot(phone);
  revalidatePath("/admin/whatsapp");
  redirect(`/admin/whatsapp?tel=${phone}`);
}

/** Envía la plantilla de reactivación a la primera tanda de la lista. */
export async function broadcastAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const segment = String(fd.get("segmento") ?? "");
  const days = Math.min(720, Math.max(14, Math.round(Number(fd.get("dias")) || 60)));
  const campaign = cleanCampaign(String(fd.get("campana") ?? ""));
  const limit = Math.min(100, Math.max(1, Math.round(Number(fd.get("cantidad")) || 25)));
  const back = (q: string) => redirect(`/admin/whatsapp/reactivacion?s=${segment}&d=${days}&c=${campaign}&${q}`);

  if (!isSegment(segment) || !campaign) return back("error=" + encodeURIComponent("Elige la lista y ponle nombre a la campaña."));
  if (String(fd.get("confirmo") ?? "").trim().toUpperCase() !== "ENVIAR") return back("error=" + encodeURIComponent("Escribe ENVIAR para confirmar."));
  if (!isWaConfigured()) return back("error=" + encodeURIComponent("WhatsApp todavía no está configurado en Vercel."));

  const r = await runBroadcast(segment, days, campaign, limit);
  revalidatePath("/admin/whatsapp/reactivacion");
  const msg = `Enviados ${r.sent} de ${r.attempted}${r.failed ? ` · fallaron ${r.failed}` : ""}${r.stoppedEarly ? " · se detuvo porque fallaron 3 seguidos" : ""}${r.firstError ? ` · ${r.firstError}` : ""}`;
  return back((r.sent > 0 ? "ok=" : "error=") + encodeURIComponent(msg.slice(0, 300)));
}
