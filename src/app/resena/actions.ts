"use server";

import { unstable_rethrow } from "next/navigation";
import { clientIp, rateLimitHit } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { isEmail } from "@/lib/reseller-shared";
import { createReview, MAX_PHOTO_BYTES } from "@/lib/reviews";

export type ReviewState = { ok?: boolean; error?: string } | undefined;

const HOUR = 60 * 60 * 1000;

/** Tipo real de la imagen según sus primeros bytes (no confiamos en el nombre ni en el tipo que declara el navegador). */
function sniff(buf: Buffer): string | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Recibe la reseña de un cliente. Queda pendiente hasta que el dueño la apruebe. */
export async function submitReview(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  try {
    if (!isDbConfigured()) return { error: "Las reseñas no están disponibles por ahora. Escríbenos por WhatsApp." };
    // Campo trampa: los bots lo llenan, las personas no lo ven.
    if (String(fd.get("website") ?? "") !== "") return { ok: true };

    const name = clean(fd.get("name"), 40);
    const email = clean(fd.get("email"), 120).toLowerCase();
    const product = clean(fd.get("product"), 80);
    const text = String(fd.get("text") ?? "").replace(/[ \t]+/g, " ").trim().slice(0, 600);
    const rating = Number(fd.get("rating"));

    if (name.length < 2) return { error: "Escribe tu nombre (puede ser solo el nombre y la inicial del apellido)." };
    if (email && !isEmail(email)) return { error: "Ese correo no parece válido. Puedes dejarlo vacío." };
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Elige de 1 a 5 estrellas." };
    if (text.length < 10) return { error: "Cuéntanos un poco más: escribe al menos una frase." };
    if (fd.get("consent") !== "on") return { error: "Necesitamos tu permiso para publicar tu reseña." };

    let photo: { base64: string; type: string } | undefined;
    const file = fd.get("photo");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PHOTO_BYTES) return { error: "La foto es muy pesada. Prueba con otra o recórtala." };
      const buf = Buffer.from(await file.arrayBuffer());
      const type = sniff(buf);
      if (!type) return { error: "La foto debe ser JPG, PNG o WebP." };
      photo = { base64: buf.toString("base64"), type };
    }

    const ip = await clientIp();
    if (!(await rateLimitHit(`review:ip:${ip}`, 5, HOUR))) return { error: "Enviaste varias reseñas seguidas. Espera un rato e intenta de nuevo." };

    await createReview({ name, email, rating, text, product, photo });
    return { ok: true };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[reseñas] error:", e);
    return { error: "No pudimos guardar tu reseña ahora. Intenta de nuevo en unos minutos." };
  }
}
