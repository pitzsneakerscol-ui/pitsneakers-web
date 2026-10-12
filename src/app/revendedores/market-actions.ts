"use server";

import { revalidatePath } from "next/cache";
import { rateLimitHit, requireUser } from "@/lib/auth";
import { createQuestion } from "@/lib/market";
import { markAllRead } from "@/lib/notifications";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { questionEmail } from "@/lib/market-emails";
import { siteConfig } from "@/config/site";
import { getDb } from "@/lib/db";
import type { ActionState } from "@/lib/reseller-shared";

const HOUR = 60 * 60 * 1000;

const text = (fd: FormData, key: string, max: number): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

function money(fd: FormData, key: string): number {
  const v = fd.get(key);
  if (typeof v !== "string") return 0;
  const digits = v.replace(/[^\d]/g, "");
  return digits ? Math.min(Number(digits), 1_000_000_000) : 0;
}

/** El revendedor le pregunta al equipo si le recomiendan comprar un par. Se guarda y llega por correo a info@pitsneakers.com. */
export async function askMarket(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const model = text(fd, "model", 120);
  const size = text(fd, "size", 12);
  const buyPrice = money(fd, "buyPrice");
  const note = text(fd, "note", 600);
  if (model.length < 3) return { error: "Escribe el nombre del par que quieres consultar." };
  if (!(await rateLimitHit(`ask:${user.id}`, 8, HOUR))) {
    return { error: "Hiciste muchas consultas seguidas. Espera un rato y vuelve a intentar." };
  }

  await createQuestion(user.id, { model, size, buyPrice, note });
  revalidatePath("/revendedores", "layout");

  // Aviso al equipo por correo. Si el envío falla, la consulta ya quedó guardada y aparece en el panel del administrador.
  let sent = false;
  if (isEmailConfigured()) {
    const db = await getDb();
    const u = await db.execute({ sql: "SELECT email FROM users WHERE id = ?", args: [user.id] });
    const sellerEmail = String(u.rows[0]?.email ?? "");
    const { subject, body } = questionEmail({
      seller: user.displayName || user.username,
      username: user.username,
      sellerEmail,
      model,
      size,
      buyPrice,
      note,
      adminUrl: `${siteConfig.siteUrl.replace(/\/$/, "")}/admin/consultas`,
    });
    const res = await sendEmail({
      to: (process.env.INFO_EMAIL || siteConfig.contactEmail).trim(),
      subject,
      body,
      replyTo: sellerEmail || undefined,
    });
    sent = res.ok;
  }
  return {
    ok: true,
    message: sent
      ? "¡Listo! Le enviamos tu consulta al equipo. Te respondemos aquí en el panel y te avisamos con la campana."
      : "Guardamos tu consulta. El equipo la verá en su panel y te responde aquí.",
  };
}

/** Marca todos los avisos de la campana como leídos. */
export async function readAllNotifications(): Promise<void> {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/revendedores", "layout");
}
