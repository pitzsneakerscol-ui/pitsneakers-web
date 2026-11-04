"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { claimGuide, getOrderById, releaseGuide, saveGuide, updateFulfillment } from "@/lib/catalog-orders";
import { CARRIER_LABEL, createGuide, getGuide, isSkydropxConfigured } from "@/lib/skydropx";
import { isFulfillment, type Fulfillment } from "@/lib/fulfillment-shared";
import { buyerDeliveredEmail, buyerShippedEmail } from "@/lib/order-emails";
import { sendEmail } from "@/lib/email";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

const back = (e: string): never => redirect("/admin/pedidos?e=" + encodeURIComponent(e));

/**
 * Compra la guía del pedido en Skydropx con Interrapidísimo (se paga con los créditos de la cuenta) y guarda número,
 * etiqueta y costo. No despacha ni avisa al cliente: eso se hace después, cuando el paquete sale.
 */
export async function generateGuide(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const postal = text(fd, "postal").replace(/\D/g, "");
  if (!isSkydropxConfigured()) back("Skydropx no está conectado: faltan SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET en Vercel.");
  const order = Number.isInteger(id) && id > 0 ? await getOrderById(id) : null;
  if (!order) back("No encontré ese pedido.");
  const o = order!;
  if (o.status !== "pagado") back("Solo se compra guía para pedidos pagados.");
  if (!o.shipAddress || !o.shipDepartment) back("Este pedido no tiene dirección de entrega completa.");
  if (postal.length < 4 || postal.length > 8) back("Escribe el código postal de entrega (solo números).");
  if (!(await claimGuide(o.id))) back("Este pedido ya tiene una guía o se está generando. Recarga la página.");

  try {
    const g = await createGuide({
      declaredValue: o.amount,
      name: o.buyerName,
      phone: o.buyerPhone,
      email: o.buyerEmail,
      document: o.shipDocument,
      department: o.shipDepartment,
      city: o.buyerCity,
      postalCode: postal,
      address: o.shipAddress,
      complement: o.shipComplement,
      notes: o.shipNotes,
      reference: o.reference,
    });
    if (g.error) throw new Error(g.error);
    await saveGuide(o.id, { shipmentId: g.shipmentId, carrier: CARRIER_LABEL, tracking: g.tracking, labelUrl: g.labelUrl, cost: g.cost, postal });
  } catch (err) {
    await releaseGuide(o.id);
    back(`No se pudo generar la guía: ${err instanceof Error ? err.message : "error desconocido."}`);
  }
  revalidatePath("/admin/pedidos");
  redirect(`/admin/pedidos?ok=${encodeURIComponent(o.reference)}&g=1#${o.reference}`);
}

/** Vuelve a pedirle a Skydropx el número de guía y la etiqueta de un envío que tardó en generarse. */
export async function refreshGuide(fd: FormData): Promise<void> {
  await requireAdmin();
  const order = await getOrderById(Number(fd.get("id")));
  if (!order || !order.skyShipmentId || order.skyShipmentId === "pending") back("Ese pedido no tiene una guía por actualizar.");
  const o = order!;
  try {
    const g = await getGuide(o.skyShipmentId);
    if (g.error) throw new Error(g.error);
    await saveGuide(o.id, { shipmentId: o.skyShipmentId, carrier: CARRIER_LABEL, tracking: g.tracking || o.tracking, labelUrl: g.labelUrl || o.labelUrl, cost: g.cost || o.shipCost, postal: o.shipPostal });
  } catch (err) {
    back(`No se pudo actualizar la guía: ${err instanceof Error ? err.message : "error desconocido."}`);
  }
  revalidatePath("/admin/pedidos");
  redirect(`/admin/pedidos?ok=${encodeURIComponent(o.reference)}&g=2#${o.reference}`);
}

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
