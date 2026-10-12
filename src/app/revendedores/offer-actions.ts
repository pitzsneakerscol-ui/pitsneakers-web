"use server";

import { revalidatePath } from "next/cache";
import { rateLimitHit, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getOffer, saveOfferResponse } from "@/lib/offers";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { offerResponseEmail } from "@/lib/offer-emails";
import { siteConfig } from "@/config/site";
import type { ActionState } from "@/lib/reseller-shared";

const HOUR = 60 * 60 * 1000;

/** El vendedor acepta, rechaza o contraoferta una oferta por uno de sus pares. Al equipo le llega un correo. */
export async function respondOffer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const decision = String(fd.get("decision") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 300);
  if (!Number.isInteger(id) || id <= 0) return { error: "Oferta inválida." };
  if (!["aceptada", "rechazada", "contraoferta"].includes(decision)) return { error: "Elige qué quieres hacer." };
  if (!(await rateLimitHit(`offer:${user.id}`, 30, HOUR))) return { error: "Demasiadas respuestas seguidas. Intenta en un rato." };

  const counter = decision === "contraoferta" ? Number(String(fd.get("counter") ?? "").replace(/[^\d]/g, "")) : 0;
  if (decision === "contraoferta" && !(counter > 0)) return { error: "Escribe el precio de tu contraoferta." };

  const offer = await getOffer(id);
  if (!offer || offer.userId !== user.id) return { error: "No encontramos esa oferta." };
  if (offer.status !== "pendiente") return { error: "Esta oferta ya fue respondida." };

  const ok = await saveOfferResponse(id, user.id, decision as "aceptada" | "rechazada" | "contraoferta", counter, note);
  if (!ok) return { error: "Esta oferta ya fue respondida." };

  const db = await getDb();
  // Al aceptar, el par queda reservado para que no se venda por otro lado.
  if (decision === "aceptada" && offer.itemId) {
    await db.execute({ sql: "UPDATE items SET status = 'reservado' WHERE id = ? AND user_id = ? AND status = 'stock'", args: [offer.itemId, user.id] });
  }

  // Aviso al equipo por correo (si falla, la respuesta ya quedó guardada y se ve en Admin → Ofertas).
  if (isEmailConfigured()) {
    const { subject, body } = offerResponseEmail({
      seller: user.displayName || user.username,
      username: user.username,
      sellerEmail: offer.sellerEmail,
      par: offer.itemName,
      size: offer.size,
      amount: offer.amount,
      status: decision as "aceptada" | "rechazada" | "contraoferta",
      counterAmount: counter,
      note,
      adminUrl: `${siteConfig.siteUrl.replace(/\/$/, "")}/admin/ofertas`,
    });
    await sendEmail({
      to: (process.env.INFO_EMAIL || siteConfig.contactEmail).trim(),
      subject,
      body,
      replyTo: offer.sellerEmail || undefined,
    });
  }
  revalidatePath("/revendedores", "layout");
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message:
      decision === "aceptada"
        ? "¡Oferta aceptada! El par quedó reservado y le avisamos al equipo."
        : decision === "rechazada"
          ? "Oferta rechazada. Le avisamos al equipo."
          : "Contraoferta enviada. Le avisamos al equipo.",
  };
}
