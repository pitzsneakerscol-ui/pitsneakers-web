"use server";

import { unstable_rethrow } from "next/navigation";
import { clientIp, rateLimitHit } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { isEmail } from "@/lib/reseller-shared";
import { joinWaitlist, markWelcomed, waitlistEmail } from "@/lib/waitlist";

export type WaitlistState = { ok?: boolean; error?: string; message?: string; code?: string } | undefined;

const HOUR = 60 * 60 * 1000;

/** Inscribe el correo en la lista de espera y le manda el correo de bienvenida. */
export async function joinList(_prev: WaitlistState, fd: FormData): Promise<WaitlistState> {
  try {
    if (!isDbConfigured()) return { error: "Las inscripciones no están disponibles por ahora. Escríbenos por WhatsApp." };
    // Campo trampa: los bots lo llenan, las personas no lo ven.
    if (String(fd.get("website") ?? "") !== "") return { ok: true, message: "¡Listo! Ya estás en la lista." };
    const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 120);
    if (!isEmail(email)) return { error: "Escribe un correo válido, por ejemplo tu@correo.com." };

    const ip = await clientIp();
    if (!(await rateLimitHit(`waitlist:ip:${ip}`, 10, HOUR))) return { error: "Hiciste muchos intentos seguidos. Espera un rato e intenta de nuevo." };

    const { isNew } = await joinWaitlist(email);
    if (!isNew) return { ok: true, message: "Este correo ya estaba en la lista. Te avisamos por correo apenas abramos." };

    let emailed = false;
    if (isEmailConfigured()) {
      const { subject, body } = waitlistEmail();
      const sent = await sendEmail({ to: email, subject, body });
      if (sent.ok) {
        emailed = true;
        await markWelcomed(email);
      } else {
        console.error("[lista-espera] correo no enviado:", sent.error);
      }
    }
    return {
      ok: true,
      message: emailed ? "Te enviamos un correo de confirmación (revisa también spam). Te avisamos apenas abramos." : "Te avisamos por correo apenas abramos.",
    };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[lista-espera] error:", e);
    return { error: "No pudimos inscribirte ahora. Intenta de nuevo en unos minutos." };
  }
}
