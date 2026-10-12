"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { clientIp, createSession, destroyOtherSessions, hashPassword, rateLimitClear, rateLimitHit } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { resetEmail } from "@/lib/auth-emails";
import { consumeResetToken, createResetToken, findResetToken } from "@/lib/password-reset";
import { siteConfig } from "@/config/site";
import { isEmail, type ActionState } from "@/lib/reseller-shared";

const HOUR = 60 * 60 * 1000;
const GENERIC = "Si ese correo está registrado en una cuenta de vendedor, te acabamos de enviar un enlace para crear una contraseña nueva. Revisa también spam. El enlace vale 1 hora.";

/** "Olvidé mi contraseña": envía el enlace al correo registrado. Siempre responde lo mismo, exista o no el correo. */
export async function requestReset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    if (!isDbConfigured()) return { error: "Esta función aún no está disponible." };
    if (String(fd.get("website") ?? "") !== "") return { ok: true, message: GENERIC };
    const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 120);
    if (!isEmail(email)) return { error: "Escribe el correo con el que te registraste." };
    if (!isEmailConfigured()) {
      return { error: "El envío de correos no está disponible en este momento. Escríbenos por WhatsApp y te ayudamos a recuperar tu cuenta." };
    }

    const ip = await clientIp();
    if (!(await rateLimitHit(`reset:ip:${ip}`, 8, HOUR)) || !(await rateLimitHit(`reset:${email}`, 3, HOUR))) {
      return { error: "Pediste muchos enlaces seguidos. Espera un rato e intenta de nuevo." };
    }

    const db = await getDb();
    const users = await db.execute({
      sql: "SELECT id, username, display_name FROM users WHERE email = ? AND role != 'admin' AND suspended = 0 ORDER BY id LIMIT 3",
      args: [email],
    });
    const base = siteConfig.siteUrl.replace(/\/$/, "");
    for (const u of users.rows) {
      const token = await createResetToken(Number(u.id));
      const { subject, body } = resetEmail({
        name: String(u.display_name || u.username),
        username: String(u.username),
        url: `${base}/revendedores/restablecer?token=${token}`,
      });
      await sendEmail({ to: email, subject, body });
    }
    return { ok: true, message: GENERIC };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[recuperar] error:", e);
    return { error: "No pudimos procesar la solicitud. Intenta de nuevo en unos minutos." };
  }
}

/** Guarda la contraseña nueva con el enlace del correo y deja al vendedor dentro de su panel. */
export async function confirmReset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    if (!isDbConfigured()) return { error: "Esta función aún no está disponible." };
    const token = String(fd.get("token") ?? "");
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8 || password.length > 100) return { error: "La contraseña debe tener al menos 8 caracteres." };
    if (password !== confirm) return { error: "Las contraseñas no coinciden." };

    const ip = await clientIp();
    if (!(await rateLimitHit(`resetconfirm:${ip}`, 20, HOUR))) return { error: "Demasiados intentos. Espera un rato e intenta de nuevo." };

    const found = await findResetToken(token);
    if (!found) return { error: "Este enlace ya se usó o venció. Pide uno nuevo desde “Olvidé mi contraseña”." };

    const db = await getDb();
    await db.execute({ sql: "UPDATE users SET password_hash = ?, last_login = ? WHERE id = ?", args: [await hashPassword(password), Date.now(), found.userId] });
    await consumeResetToken(token);
    // Se cierran las sesiones anteriores y se limpian los intentos fallidos de ingreso.
    await db.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [found.userId] });
    await rateLimitClear(`loginfail:${found.username}`);
    await createSession(found.userId);
    await destroyOtherSessions(found.userId);
  } catch (e) {
    unstable_rethrow(e);
    console.error("[restablecer] error:", e);
    return { error: "No pudimos guardar la contraseña. Intenta de nuevo en unos minutos." };
  }
  redirect("/revendedores/panel");
}
