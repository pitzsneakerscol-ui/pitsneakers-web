"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { acceptOffer, counterOffer, getBuyerOffer, rejectOffer } from "@/lib/buyer-offers";
import { offerAcceptedEmail, offerCounterEmail, offerRejectedEmail } from "@/lib/buyer-emails";
import { sendEmail } from "@/lib/email";

const note = (fd: FormData) => String(fd.get("note") ?? "").replace(/\s+/g, " ").trim().slice(0, 300);

async function notify(id: number, build: typeof offerAcceptedEmail) {
  const o = await getBuyerOffer(id);
  if (!o) return;
  const m = build(o);
  await sendEmail({ to: o.buyerEmail, subject: m.subject, body: m.body }).catch(() => undefined);
}

/** Acepta, rechaza o contraoferta. Si la oferta ya cambió de estado (la retiró el comprador, venció) no hace nada. */
export async function respondOffer(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const action = String(fd.get("action") ?? "");
  if (!Number.isInteger(id) || id <= 0) return;

  if (action === "aceptar") {
    if (await acceptOffer(id)) await notify(id, offerAcceptedEmail);
  } else if (action === "rechazar") {
    if (await rejectOffer(id, note(fd))) await notify(id, offerRejectedEmail);
  } else if (action === "contraoferta") {
    const o = await getBuyerOffer(id);
    const amount = Math.round(Number(String(fd.get("counter") ?? "").replace(/\D/g, "")));
    if (o && amount > o.amount && amount <= o.listPrice && (await counterOffer(id, amount, note(fd)))) await notify(id, offerCounterEmail);
  }
  revalidatePath("/admin/ofertas-clientes");
}
