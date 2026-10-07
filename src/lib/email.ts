import "server-only";
import { siteConfig } from "@/config/site";

// Envío por Resend (https://resend.com). Variables de entorno:
//   RESEND_API_KEY  — clave de la API
//   EMAIL_FROM      — remitente verificado, ej: "Pitsneakers <hola@tudominio.com>"
//   EMAIL_REPLY_TO  — (opcional) correo donde quieres recibir las respuestas

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Texto plano → HTML con la marca de la tienda. Todo el contenido va escapado. */
export function emailHtml(subject: string, body: string): string {
  const content = escapeHtml(body)
    .replace(
      /(https:\/\/[^\s<]+)/g,
      '<a href="$1" style="color:#c8402a">$1</a>'
    )
    .replace(/\n/g, "<br>");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f3ef;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a0a0a;padding:20px 28px;font-size:24px;font-weight:bold;letter-spacing:1px;color:#fff">PIT<span style="color:#c8402a">SNEAKERS</span></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6"><div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#777;margin-bottom:12px">${escapeHtml(subject)}</div>${content}</td></tr>
<tr><td style="padding:16px 28px;background:#faf9f7;font-size:12px;color:#777">${escapeHtml(siteConfig.name)} · ${escapeHtml(siteConfig.city)}</td></tr>
</table></td></tr></table></body></html>`;
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
        text: opts.body,
        html: emailHtml(opts.subject, opts.body),
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
