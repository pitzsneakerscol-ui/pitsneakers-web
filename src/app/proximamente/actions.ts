"use server";

import { unstable_rethrow } from "next/navigation";
import { clientIp, rateLimitHit } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { isEmail } from "@/lib/reseller-shared";
import { joinWaitlist, markWelcomed, waitlistEmail } from "@/lib/waitlist";

export type WaitlistState = { ok?: boolean; error?: string; message?: string; code?: string } | undefined;

const HOUR = 60 * 60 * 1000;

/** Inscribe el correo en la lista de espera y le manda su pase para la subasta. */
export async function joinList(_prev: WaitlistState, fd: FormData): Promise<WaitlistState> {
  try {
    if (!isDbConfigured()) return { error: "Las inscripciones no están disponibles por ahora. Escríbenos por WhatsApp." };
    // Campo trampa: los bots lo llenan, las personas no lo ven.
    if (String(fd.get("website") ?? "") !== "") return { ok: true, message: "¡Listo! Ya estás en la lista." };
    const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 120);
    if (!isEmail(email)) return { error: "Escribe un correo válido, por ejemplo tu@correo.com." };

    const ip = await clientIp();
    if (!(await rateLimitHit(`waitlist:ip:${ip}`, 10, HOUR))) return { error: "Hiciste muchos intentos seguidos. Espera un rato e intenta de nuevo." };

    const { code, isNew } = await joinWaitlist(email);
    if (!isNew) return { ok: true, message: "Este correo ya estaba en la lista. Revisa tu bandeja (y spam): ahí está tu pase." };

    let emailed = false;
    if (isEmailConfigured()) {
      const { subject, body } = waitlistEmail(code);
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
      code,
      message: emailed ? "Te enviamos tu pase a tu correo (revisa también spam)." : "Guarda este código: es tu pase personal y no se repite.",
    };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[lista-espera] error:", e);
    return { error: "No pudimos inscribirte ahora. Intenta de nuevo en unos minutos." };
  }
}
