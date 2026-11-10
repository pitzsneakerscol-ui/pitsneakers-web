"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { siteConfig } from "@/config/site";
import { sendMetaEvent } from "@/lib/meta";
import { clientIp, rateLimitHit } from "@/lib/auth";
import { importContacts } from "@/lib/contacts";
import { isDbConfigured } from "@/lib/db";
import { isEmail } from "@/lib/reseller-shared";
import { isSendableEmail } from "@/lib/campaigns";
import { BF_COOKIE } from "@/lib/sale-shared";

/** `eid`: id del evento de Meta (solo cuando se registró un correo de verdad). */
export type LeadState = { ok?: boolean; error?: string; eid?: string } | undefined;

const HOUR = 60 * 60 * 1000;

/**
 * Black Friday: el visitante deja su correo para entrar. Se guarda en los contactos de marketing (origen "black-friday")
 * y se recuerda en una cookie de un año para que no se lo pidan otra vez. Quien ya se había dado de baja sigue de baja.
 */
export async function joinBlackFriday(_prev: LeadState, fd: FormData): Promise<LeadState> {
  try {
    // Campo trampa: los bots lo llenan, las personas no lo ven.
    if (String(fd.get("website") ?? "") !== "") return { ok: true };
    const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 120);
    if (!isEmail(email) || !isSendableEmail(email)) return { error: "Escribe un correo válido, por ejemplo tu@correo.com." };

    const ip = await clientIp();
    if (!isDbConfigured()) {
      // Sin base de datos no se puede guardar el contacto, pero tampoco se le cierra la puerta a quien quiere ver las ofertas.
      console.error("[black-friday] sin base de datos: el correo no se guardó");
    } else {
      if (!(await rateLimitHit(`bf-lead:ip:${ip}`, 10, HOUR))) return { error: "Hiciste muchos intentos seguidos. Espera un rato e intenta de nuevo." };
      await importContacts([{ email, name: "", phone: "", city: "", notes: "", unsubscribed: false }], "black-friday");
    }

    const jar = await cookies();
    jar.set(BF_COOKIE, "1", { maxAge: 365 * 24 * 3600, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });

    // Meta: el correo es un "Lead". El mismo `eid` lo usa el píxel en el navegador, así Meta lo cuenta una sola vez.
    const eid = `lead-${randomUUID()}`;
    const userAgent = (await headers()).get("user-agent") ?? undefined;
    const fbp = jar.get("_fbp")?.value;
    const fbc = jar.get("_fbc")?.value;
    after(() =>
      sendMetaEvent({ name: "Lead", id: eid, url: `${siteConfig.siteUrl}/black-friday`, user: { email, ip, userAgent, fbp, fbc }, custom: { content_name: "Lista Black Friday" } }),
    );
    return { ok: true, eid };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[black-friday] error:", e);
    return { error: "No pudimos registrarte ahora. Intenta de nuevo en unos minutos." };
  }
}
