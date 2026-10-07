import "server-only";
import { renderEmailHtml, renderEmailText } from "@/lib/email-templates";

// Envío por Resend (https://resend.com). Variables de entorno:
//   RESEND_API_KEY  — clave de la API
//   EMAIL_FROM      — remitente verificado, ej: "Pitsneakers <hola@tudominio.com>"
//   EMAIL_REPLY_TO  — (opcional) correo donde quieres recibir las respuestas

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  if (!isEmailConfigured()) return { ok: false, error: "Correo no configurado." };
  try {
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        text: renderEmailText(opts.body),
        html: renderEmailHtml(opts.subject, opts.body),
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, error: (data?.message ?? `Error ${res.status}`).slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Fallo de red." };
  }
}
