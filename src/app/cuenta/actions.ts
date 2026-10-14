"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clientIp, rateLimitHit } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { isEmail } from "@/lib/reseller-shared";
import { safeNext } from "@/lib/buyer-shared";
import { siteConfig } from "@/config/site";
import { sendEmail } from "@/lib/email";
import { buyerResetEmail, verifyEmail } from "@/lib/buyer-emails";
import {
  addManualPair,
  checkLogin,
  consumeToken,
  createBuyer,
  createBuyerSession,
  createToken,
  destroyBuyerSession,
  findBuyerByEmail,
  findToken,
  getBuyer,
  markVerified,
  removeManualPair,
  setBuyerPassword,
  updateProfile,
} from "@/lib/buyers";

export type CuentaState = { error?: string; ok?: boolean; message?: string } | undefined;

const clean = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const origin = () => siteConfig.siteUrl.replace(/\/$/, "");

async function sendVerification(buyerId: number, email: string, name: string): Promise<void> {
  const token = await createToken(buyerId, "verify");
  const mail = verifyEmail({ name, url: `${origin()}/cuenta/verificar?token=${token}` });
  await sendEmail({ to: email, subject: mail.subject, body: mail.body });
}

export async function register(_prev: CuentaState, fd: FormData): Promise<CuentaState> {
  let dest: string;
  try {
    if (!isDbConfigured()) return { error: "Las cuentas aún no están disponibles." };
    if (clean(fd, "website", 50) !== "") return { error: "No pudimos crear tu cuenta." };
    const name = clean(fd, "name", 80);
    const email = clean(fd, "email", 120).toLowerCase();
    const password = String(fd.get("password") ?? "");
    if (name.length < 2) return { error: "Escribe tu nombre." };
    if (!isEmail(email)) return { error: "Escribe un correo válido." };
    if (password.length < 8 || password.length > 200) return { error: "La contraseña debe tener al menos 8 caracteres." };
    const ip = await clientIp();
    if (!(await rateLimitHit(`cuenta-reg:${ip}`, 8, 60 * 60 * 1000))) return { error: "Muchos intentos seguidos. Espera un rato e intenta de nuevo." };

    const buyer = await createBuyer({ email, name, password });
    if (!buyer) return { error: "Ese correo ya tiene cuenta. Inicia sesión o recupera tu contraseña." };
    if (!buyer.verified) await sendVerification(buyer.id, buyer.email, buyer.name);
    await createBuyerSession(buyer.id);
    // Sin correo verificado todavía: se le muestra el aviso en su cuenta; si ya está verificado (local), sigue a donde iba.
    dest = buyer.verified ? safeNext(clean(fd, "next", 200)) : "/cuenta?nuevo=1";
  } catch (e) {
    unstable_rethrow(e);
    console.error("[cuenta] registro:", e);
    return { error: "No pudimos crear tu cuenta. Intenta de nuevo en unos minutos." };
  }
  redirect(dest);
}

export async function login(_prev: CuentaState, fd: FormData): Promise<CuentaState> {
  let dest: string;
  try {
    if (!isDbConfigured()) return { error: "Las cuentas aún no están disponibles." };
    const email = clean(fd, "email", 120).toLowerCase();
    const password = String(fd.get("password") ?? "").slice(0, 200);
    if (!isEmail(email) || !password) return { error: "Escribe tu correo y contraseña." };
    const ip = await clientIp();
    if (!(await rateLimitHit(`cuenta-login:${ip}:${email}`, 10, 15 * 60 * 1000))) return { error: "Muchos intentos. Espera unos minutos o recupera tu contraseña." };
    const buyer = await checkLogin(email, password);
    if (!buyer) {
      const existing = await findBuyerByEmail(email);
      if (existing && !existing.hasPassword && existing.google) return { error: "Esta cuenta se creó con Google. Entra con el botón de Google." };
      return { error: "Correo o contraseña incorrectos." };
    }
    await createBuyerSession(buyer.id);
    dest = safeNext(clean(fd, "next", 200));
  } catch (e) {
    unstable_rethrow(e);
    console.error("[cuenta] login:", e);
    return { error: "No pudimos iniciar sesión. Intenta de nuevo." };
  }
  redirect(dest);
}

export async function logout(): Promise<void> {
  await destroyBuyerSession();
  redirect("/");
}

export async function resendVerification(): Promise<CuentaState> {
  const buyer = await getBuyer();
  if (!buyer || buyer.verified) return { ok: true, message: "Tu correo ya está verificado." };
  const ip = await clientIp();
  if (!(await rateLimitHit(`cuenta-verif:${buyer.id}`, 4, 60 * 60 * 1000)) || !(await rateLimitHit(`cuenta-verif-ip:${ip}`, 12, 60 * 60 * 1000))) {
    return { error: "Ya te enviamos varios correos. Revisa tu bandeja (y spam) y espera un rato." };
  }
  await sendVerification(buyer.id, buyer.email, buyer.name);
  return { ok: true, message: `Te enviamos un correo a ${buyer.email}. Abre el enlace para confirmar.` };
}

export async function requestReset(_prev: CuentaState, fd: FormData): Promise<CuentaState> {
  if (!isDbConfigured()) return { error: "Las cuentas aún no están disponibles." };
  if (clean(fd, "website", 50) !== "") return { ok: true, message: "Si ese correo tiene cuenta, te enviamos un enlace." };
  const email = clean(fd, "email", 120).toLowerCase();
  if (!isEmail(email)) return { error: "Escribe un correo válido." };
  const ip = await clientIp();
  if (!(await rateLimitHit(`cuenta-reset:${ip}`, 6, 60 * 60 * 1000))) return { error: "Muchos intentos. Espera un rato e intenta de nuevo." };
  try {
    const buyer = await findBuyerByEmail(email);
    if (buyer) {
      const token = await createToken(buyer.id, "reset");
      const mail = buyerResetEmail({ name: buyer.name, url: `${origin()}/cuenta/restablecer?token=${token}` });
      await sendEmail({ to: buyer.email, subject: mail.subject, body: mail.body });
    }
  } catch (e) {
    console.error("[cuenta] reset:", e);
  }
  // Misma respuesta exista o no el correo: así no se puede averiguar quién tiene cuenta.
  return { ok: true, message: "Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Vale 1 hora." };
}

export async function confirmReset(_prev: CuentaState, fd: FormData): Promise<CuentaState> {
  const token = clean(fd, "token", 80);
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8 || password.length > 200) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };
  const buyer = await findToken(token, "reset");
  if (!buyer) return { error: "Este enlace ya no sirve. Pide uno nuevo." };
  await setBuyerPassword(buyer.id, password);
  // Quien abre el enlace del correo demuestra que el correo es suyo.
  await markVerified(buyer.id);
  await consumeToken(token);
  await createBuyerSession(buyer.id);
  redirect("/cuenta");
}

export async function saveProfile(_prev: CuentaState, fd: FormData): Promise<CuentaState> {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  const name = clean(fd, "name", 80);
  const phone = clean(fd, "phone", 20).replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
  const city = clean(fd, "city", 60);
  if (name.length < 2) return { error: "Escribe tu nombre." };
  if (phone && !/^3\d{9}$/.test(phone)) return { error: "El celular debe tener 10 dígitos y empezar por 3." };
  await updateProfile(buyer.id, { name, phone, city });
  revalidatePath("/cuenta", "layout");
  return { ok: true, message: "Guardado." };
}

export async function changePassword(_prev: CuentaState, fd: FormData): Promise<CuentaState> {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  const current = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < 8 || password.length > 200) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  if (buyer.hasPassword) {
    if (!(await rateLimitHit(`cuenta-pass:${buyer.id}`, 8, 60 * 60 * 1000))) return { error: "Muchos intentos. Espera un rato." };
    if (!(await checkLogin(buyer.email, current))) return { error: "La contraseña actual no es correcta." };
  }
  await setBuyerPassword(buyer.id, password);
  return { ok: true, message: "Contraseña actualizada." };
}

export async function addPair(_prev: CuentaState, fd: FormData): Promise<CuentaState> {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  const name = clean(fd, "name", 100);
  const brand = clean(fd, "brand", 40);
  const size = clean(fd, "size", 12);
  const paid = Math.round(Number(String(fd.get("paid") ?? "").replace(/\D/g, "")));
  if (name.length < 3) return { error: "Escribe el nombre del par (por ejemplo: Jordan 1 High Chicago)." };
  if (!Number.isFinite(paid) || paid < 0 || paid > 100_000_000) return { error: "Escribe cuánto pagaste (solo números)." };
  await addManualPair(buyer.id, { name, brand, size, paid });
  revalidatePath("/cuenta");
  return { ok: true, message: "Agregado a tu colección." };
}

export async function removePair(fd: FormData): Promise<void> {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  const id = Number(fd.get("id"));
  if (Number.isInteger(id) && id > 0) await removeManualPair(buyer.id, id);
  revalidatePath("/cuenta");
}
