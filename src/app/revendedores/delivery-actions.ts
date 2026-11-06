"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { rateLimitHit, requireUser } from "@/lib/auth";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { saveItemDelivery, sniffImage } from "@/lib/item-delivery";
import { MAX_PHOTO_BYTES } from "@/lib/verification-shared";
import { siteConfig } from "@/config/site";
import type { ActionState } from "@/lib/reseller-shared";

/**
 * Compra confirmada en el inventario: el revendedor avisa que ya dejó el par en el punto de verificación (o que lo envió)
 * y sube una foto de prueba (el par en el punto, o la guía/recibo del envío). Al equipo le llega un correo con el aviso.
 */
export async function confirmItemDelivery(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const itemId = Number(fd.get("itemId"));
    if (!Number.isInteger(itemId) || itemId <= 0) return { error: "Par inválido." };
    const delivery = fd.get("delivery") === "envio" ? "envio" : "dropoff";
    const tracking = String(fd.get("tracking") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);

    const file = fd.get("proof");
    if (!(file instanceof File) || file.size === 0) {
      return { error: delivery === "envio" ? "Sube una foto de la guía o del recibo del envío." : "Sube una foto del par ya entregado en el punto." };
    }
    if (file.size > MAX_PHOTO_BYTES) return { error: "La foto pesa demasiado. Prueba con otra o toma una nueva." };
    const data = new Uint8Array(await file.arrayBuffer());
    const mime = sniffImage(data);
    if (!mime) return { error: "La foto debe ser JPG, PNG o WebP." };

    if (!(await rateLimitHit(`entrega-par:${user.id}`, 20, 60 * 60 * 1000))) return { error: "Hiciste muchos intentos seguidos. Espera un rato." };

    const item = await saveItemDelivery(user.id, itemId, { delivery, tracking, mime, data });
    if (!item) return { error: "No pudimos registrarlo: ese par ya lo habías avisado o su compra no está confirmada." };
    revalidatePath("/revendedores/inventario");

    if (isEmailConfigured()) {
      const seller = user.displayName || user.username;
      const par = `${item.brand && !item.name.toLowerCase().startsWith(item.brand.toLowerCase()) ? `${item.brand} ` : ""}${item.name}`;
      await sendEmail({
        to: siteConfig.contactEmail,
        subject: `${seller} ${delivery === "envio" ? "envió" : "dejó"} el par: ${par}`,
        body: [
          `# ${delivery === "envio" ? "Un vendedor envió un par" : "Un vendedor dejó un par en el punto"}`,
          "",
          `${seller} avisó desde su inventario que ${delivery === "envio" ? "**envió**" : "**dejó en el punto de verificación**"} **${par}**${item.size ? ` (talla ${item.size})` : ""}.`,
          tracking ? `\nGuía: **${tracking}**` : "",
          "",
          "Subió una foto de prueba: la ves en Admin → Revendedores → su ficha, en la columna Estado del par.",
          "",
          "Cuando llegue, verifícalo y págale.",
        ].join("\n"),
      }).catch((e) => console.error("[inventario] aviso de entrega no enviado:", e));
    }
    return { ok: true, message: "¡Listo! Avisamos al equipo. Ahora déjanos tus datos de pago." };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[inventario] error al registrar la entrega:", e);
    return { error: "No pudimos guardarlo ahora. Intenta de nuevo en unos minutos." };
  }
}
