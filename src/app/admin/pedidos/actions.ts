"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { addOrderPhoto, claimGuide, deleteOrderPhoto, getOrderById, photoRoom, releaseGuide, saveGuide, markSellerConfirmed, saveVerification, setPayoutStatus, updateFulfillment } from "@/lib/catalog-orders";
import { MAX_PHOTO_BYTES, isVerified, parseChecks } from "@/lib/verification-shared";
import { CARRIER_LABEL, createGuide, getGuide, isSkydropxConfigured } from "@/lib/skydropx";
import { isFulfillment, type Fulfillment } from "@/lib/fulfillment-shared";
import { buyerDeliveredEmail, buyerOnTheWayEmail, buyerReceivedEmail, buyerShippedEmail, buyerVerifiedEmail } from "@/lib/order-emails";
import { sendEmail } from "@/lib/email";
import { after } from "next/server";
import { notifySellerPayout, pushOrderStep, type OrderPushStep } from "@/lib/push-events";
import { isPayoutStatus, type PayoutStatus } from "@/lib/payout-shared";
import { confirmOrderToSeller } from "@/lib/seller-confirm";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

const back = (e: string): never => redirect("/admin/pedidos?e=" + encodeURIComponent(e));

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Guarda la verificación del par al recibirlo: puntos marcados, nota y fotos de recepción (evidencia si hay un reclamo).
 * Las fotos llegan ya reducidas desde el navegador; aquí solo se valida tipo, peso y cupo antes de guardar nada.
 */
export async function verifyOrder(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const order = await getOrderById(Number(fd.get("id")));
  if (!order) back("No encontré ese pedido.");
  const o = order!;
  if (o.status !== "pagado") back("Solo se verifican pedidos pagados.");

  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 0) {
    if (files.length > (await photoRoom(o.id))) back("Ese pedido ya tiene el máximo de fotos. Borra alguna para subir otras.");
    for (const f of files) {
      if (!PHOTO_TYPES.includes(f.type)) back("Las fotos deben ser JPG, PNG o WebP.");
      if (f.size > MAX_PHOTO_BYTES) back("Una foto pesa demasiado. Prueba con otra o súbela de nuevo.");
    }
  }

  const checks = parseChecks(fd.getAll("check").map(String).join(","));
  await saveVerification(o.id, { checks, by: admin.displayName || admin.username, note: text(fd, "note") });
  for (const f of files) await addOrderPhoto(o.id, f.type, new Uint8Array(await f.arrayBuffer()));

  // Al dar el par por verificado (solo la primera vez) se le avisa al cliente, si el equipo lo pide.
  let emailed = "";
  if (fd.get("notify") === "on" && isVerified(checks) && !isVerified(o.verifChecks)) {
    const fresh = (await getOrderById(o.id)) ?? o;
    const mail = buyerVerifiedEmail(fresh);
    const sent = await sendEmail({ to: fresh.buyerEmail, subject: mail.subject, body: mail.body }).catch(() => ({ ok: false as const }));
    emailed = sent.ok ? "1" : "0";
    after(() => pushOrderStep(fresh, "verificado"));
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/pedido/${o.reference}`);
  redirect(`/admin/pedidos?ok=${encodeURIComponent(o.reference)}&g=3${emailed ? `&m=${emailed}` : ""}#${o.reference}`);
}

/** Borra una foto de recepción de un pedido. */
export async function removePhoto(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("photo"));
  if (Number.isInteger(id) && id > 0) await deleteOrderPhoto(id);
  revalidatePath("/admin/pedidos");
  redirect(`/admin/pedidos#${encodeURIComponent(text(fd, "ref"))}`);
}

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
          : o.fulfillment === "hacia_verificacion" && res.before !== "hacia_verificacion"
            ? buyerOnTheWayEmail(o)
            : o.fulfillment === "preparando" && res.before !== "preparando"
              ? buyerReceivedEmail(o)
              : null;
    if (mail) {
      const sent = await sendEmail({ to: o.buyerEmail, subject: mail.subject, body: mail.body }).catch(() => ({ ok: false as const }));
      emailed = sent.ok ? "1" : "0";
      // El mismo aviso, como notificación en la app (si el comprador la tiene instalada).
      const pushStep: OrderPushStep = o.fulfillment === "despachado" ? "despachado" : o.fulfillment === "entregado" ? "entregado" : o.fulfillment === "hacia_verificacion" ? "en_camino" : "recibido";
      after(() => pushOrderStep(o, pushStep));
    }
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/pedido/${res.order.reference}`);
  redirect(`/admin/pedidos?ok=${encodeURIComponent(res.order.reference)}${res.order.fulfillment === "entregado" ? "&g=5" : ""}${emailed ? `&m=${emailed}` : ""}`);
}

/**
 * Cambia el estado del pago al revendedor dueño del par (pendiente → en proceso → pagado). Si el equipo lo pide,
 * le avisa al revendedor (campana, celular y navegador) cuando pasa a "en proceso" o "pagado".
 */
export async function savePayoutStatus(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const status = text(fd, "payout");
  if (!Number.isInteger(id) || id <= 0 || !isPayoutStatus(status)) back("Pedido o estado de pago no válido.");
  const res = await setPayoutStatus(id, status as PayoutStatus);
  if (!res) back("Ese pedido no tiene un revendedor al que pagarle.");
  const { order, changed } = res!;
  if (changed && fd.get("notify") === "on") after(() => notifySellerPayout(order, status as PayoutStatus));
  revalidatePath("/admin/pedidos");
  revalidatePath("/revendedores/pedidos");
  redirect(`/admin/pedidos?ok=${encodeURIComponent(order.reference)}&g=6#${order.reference}`);
}

/**
 * Le confirma el pedido al revendedor dueño del par: le dice dónde dejar el par (punto de verificación de Bogotá) y las reglas.
 * Siempre le llega el aviso al panel y al celular; el correo es opcional. Se puede reenviar.
 */
export async function confirmSellerOrder(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) back("Pedido no válido.");
  const current = await getOrderById(id);
  if (!current || current.status !== "pagado") back("Solo se confirman pedidos pagados.");
  const order = await markSellerConfirmed(id);
  if (!order) back("Ese pedido no tiene un revendedor al que confirmarle.");
  const sent = await confirmOrderToSeller(order!, { email: fd.get("email") === "on" });
  revalidatePath("/admin/pedidos");
  revalidatePath("/revendedores/pedidos");
  const m = sent === "sent" ? "1" : sent === "skipped" ? "" : "0";
  redirect(`/admin/pedidos?ok=${encodeURIComponent(order!.reference)}&g=7${m ? `&m=${m}&s=1` : ""}#${order!.reference}`);
}
