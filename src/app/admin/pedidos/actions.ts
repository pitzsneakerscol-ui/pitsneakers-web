"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateFulfillment } from "@/lib/catalog-orders";
import { isFulfillment, type Fulfillment } from "@/lib/fulfillment-shared";
import { buyerDeliveredEmail, buyerShippedEmail } from "@/lib/order-emails";
import { sendEmail } from "@/lib/email";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

/**
 * Cambia el paso de envío de un pedido pagado. Si el equipo lo pide (casilla "Avisar al cliente"), manda el correo
 * de despachado (con guía) o de entregado, una sola vez por cambio. Los errores vuelven al panel con un mensaje.
 */
export async function saveFulfillment(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const step = text(fd, "step");
  if (!Number.isInteger(id) || id <= 0 || !isFulfillment(step)) redirect("/admin/pedidos?e=" + encodeURIComponent("Pedido o paso no válido."));

  const res = await updateFulfillment(id, {
    step: step as Fulfillment,
    carrier: text(fd, "carrier"),
    tracking: text(fd, "tracking"),
    note: text(fd, "note"),
  });
  if (!res.ok) redirect("/admin/pedidos?e=" + encodeURIComponent(res.error));

  let emailed = "";
  if (fd.get("notify") === "on") {
    const o = res.order;
    const mail =
      o.fulfillment === "despachado" && (res.justShipped || res.shipmentChanged)
        ? buyerShippedEmail(o)
        : o.fulfillment === "entregado" && res.justDelivered
          ? buyerDeliveredEmail(o)
          : null;
    if (mail) {
      const sent = await sendEmail({ to: o.buyerEmail, subject: mail.subject, body: mail.body }).catch(() => ({ ok: false as const }));
      emailed = sent.ok ? "1" : "0";
    }
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/pedido/${res.order.reference}`);
  redirect(`/admin/pedidos?ok=${encodeURIComponent(res.order.reference)}${emailed ? `&m=${emailed}` : ""}`);
}
