"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { buildMail, campaignMissingVars, cleanCampaign, MAX_PER_SEND, pendingCount, sendBatch, sendCampaign } from "@/lib/campaigns";
import { isEmailConfigured } from "@/lib/email";
import { isEmail, type ActionState } from "@/lib/reseller-shared";

const NOT_CONFIGURED = "El servicio de correo no está configurado. Agrega RESEND_API_KEY y EMAIL_FROM en las variables de entorno.";

function readMessage(fd: FormData): { subject: string; body: string } | { error: string } {
  const subject = String(fd.get("subject") ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  const body = String(fd.get("body") ?? "").slice(0, 5000).trim();
  if (!subject || !body) return { error: "Escribe el asunto y el mensaje." };
  const missing = campaignMissingVars(subject, body);
  if (missing.length) return { error: `Hay variables sin valor: ${missing.map((v) => `{{${v}}}`).join(", ")}. Quítalas del mensaje.` };
  return { subject, body };
}

/** Un correo de prueba a la dirección que indiques, con el mismo diseño y enlace de baja de prueba. */
export async function sendCampaignTest(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!isEmailConfigured()) return { error: NOT_CONFIGURED };
  const msg = readMessage(fd);
  if ("error" in msg) return msg;
  const to = String(fd.get("testTo") ?? "").trim().toLowerCase();
  if (!isEmail(to)) return { error: "Escribe el correo al que quieres mandar la prueba." };

  const mail = buildMail(msg.subject, msg.body, { email: to, name: String(fd.get("testName") ?? "").trim() || "Camilo", token: "prueba" }, true);
  const r = await sendBatch([mail]);
  return r.ok ? { ok: true, message: `Prueba enviada a ${to}. Revisa también la carpeta de spam.` } : { error: `No se pudo enviar: ${r.error}` };
}

/** Envía la campaña a los próximos contactos pendientes (máximo MAX_PER_SEND por vez). */
export async function sendCampaignAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!isEmailConfigured()) return { error: NOT_CONFIGURED };
  const msg = readMessage(fd);
  if ("error" in msg) return msg;

  const campaign = cleanCampaign(String(fd.get("campaign") ?? ""));
  if (campaign.length < 3) return { error: "Ponle un nombre a la campaña (por ejemplo: comunidad-noviembre)." };
  const limit = Math.floor(Number(fd.get("limit")));
  if (!Number.isFinite(limit) || limit < 1 || limit > MAX_PER_SEND) return { error: `Elige entre 1 y ${MAX_PER_SEND} correos por envío.` };
  if (fd.get("confirm") !== "on") return { error: "Marca la casilla para confirmar el envío." };

  const pending = await pendingCount(campaign);
  if (pending === 0) return { error: "No quedan contactos pendientes en esta campaña." };

  const r = await sendCampaign(campaign, msg.subject, msg.body, limit);
  revalidatePath("/admin/contactos/campana");
  const left = await pendingCount(campaign);
  const skipped = r.invalid ? ` ${r.invalid} correo${r.invalid === 1 ? "" : "s"} con dirección no válida se apartaron (revísalos en Contactos).` : "";
  if (r.failed === 0) return { ok: true, message: `Enviamos ${r.sent} correo${r.sent === 1 ? "" : "s"}.${skipped} Quedan ${left} pendientes en esta campaña.` };
  return { error: `Enviados ${r.sent} de ${r.claimed}. ${r.failed} fallaron (${r.firstError}).${skipped} Puedes volver a enviar: solo se reintentan los que fallaron y los pendientes.` };
}
