"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rateLimitHit, requireAdmin } from "@/lib/auth";
import { createOrder, getOrderById, markEmailed, markManualPaid, saveVerification, updateFulfillment } from "@/lib/catalog-orders";
import { getAllProducts } from "@/lib/products";
import { isEmail } from "@/lib/reseller-shared";
import { parseShipping } from "@/lib/shipping-shared";
import { CARRIERS, DIRECT_CARRIER } from "@/lib/fulfillment-shared";
import { VERIF_CHECKS } from "@/lib/verification-shared";
import { buyerDeliveredEmail, buyerOnTheWayEmail, buyerPaidEmail, buyerReceivedEmail, buyerShippedEmail, buyerVerifiedEmail } from "@/lib/order-emails";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { isMessageType, type SaleState } from "@/lib/sale-shared";

const clean = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Avisa a un cliente que compró por WhatsApp en qué va su pedido. Se elige el par del catálogo (con su foto, talla y estado),
 * el nombre, el correo y el tipo de mensaje. Por detrás se crea el pedido ya pagado en el paso que corresponde, para que el
 * cliente tenga su enlace de seguimiento y el resto de avisos se mande desde la lista de pedidos.
 */
export async function registerSale(_prev: SaleState, fd: FormData): Promise<SaleState> {
  const admin = await requireAdmin();
  if (!isEmailConfigured()) return { error: "El correo no está configurado (RESEND_API_KEY y EMAIL_FROM en Vercel): no se puede avisar al cliente." };

  const p = (await getAllProducts()).find((x) => x.id === clean(fd, "productId", 80));
  if (!p) return { error: "Elige el par de la lista." };
  const size = clean(fd, "size", 30);
  // La talla se escribe libre: la que compró el cliente puede no ser una de las publicadas en el catálogo.
  if (!size) return { error: "Escribe la talla del par." };

  const name = clean(fd, "name", 80);
  const email = clean(fd, "email", 120).toLowerCase();
  if (name.length < 2) return { error: "Escribe el nombre del cliente." };
  if (!isEmail(email)) return { error: "Escribe un correo válido." };

  const type = clean(fd, "type", 20);
  if (!isMessageType(type)) return { error: "Elige el tipo de mensaje." };

  // Opcionales: celular y dirección (la dirección solo hace falta para generar la guía de Skydropx después).
  // El precio no se pide: se guarda el de la página (la guía lo usa como valor declarado) y no sale en los correos.
  const phone = clean(fd, "phone", 20).replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
  if (phone && !/^3\d{9}$/.test(phone)) return { error: "El celular debe tener 10 dígitos (empieza por 3) o déjalo vacío." };
  const hasShip = ["department", "city", "address"].some((k) => clean(fd, k, 120));
  const ship = hasShip ? parseShipping(fd) : null;
  if (ship && "error" in ship) return { error: ship.error };

  const carrier = clean(fd, "carrier", 40);
  const tracking = clean(fd, "tracking", 60);
  if (type === "despachado") {
    if (!(CARRIERS as readonly string[]).includes(carrier)) return { error: "Para avisar el despacho elige la transportadora." };
    if (carrier !== DIRECT_CARRIER && !tracking) return { error: "Para avisar el despacho escribe el número de guía." };
  }

  // Evita mandar el mismo aviso dos veces por un doble clic.
  if (!(await rateLimitHit(`aviso-manual:${p.id}:${email}:${type}`, 1, 30_000))) return { error: "Ese aviso ya se mandó hace un momento. Revisa la lista de pedidos." };

  const created = await createOrder({
    productId: p.id,
    productName: p.name,
    brand: p.brand,
    size,
    condition: p.condition,
    image: p.images[0] ?? "",
    amount: p.price,
    creditCode: "",
    discount: 0,
    fee: 0,
    buyerName: name,
    buyerEmail: email,
    buyerPhone: phone,
    buyerCity: ship?.data.city ?? "",
    shipDepartment: ship?.data.department ?? "",
    shipAddress: ship?.data.address ?? "",
    shipComplement: ship?.data.complement ?? "",
    shipDocument: ship?.data.document ?? "",
    shipNotes: ship?.data.notes ?? "",
  });

  // Deja el pedido en el paso del mensaje, para que el seguimiento y el correo muestren lo mismo.
  const start = type === "en_camino" ? "hacia_verificacion" : type === "recibido" || type === "verificado" ? "preparando" : "por_preparar";
  if (!(await markManualPaid(created.id, "WhatsApp", start))) return { error: "No se pudo crear el pedido. Intenta de nuevo." };
  if (type === "verificado") await saveVerification(created.id, { checks: VERIF_CHECKS.map((c) => c.key), by: admin.displayName || admin.username, note: "" });
  if (type === "despachado" || type === "entregado") {
    const r = await updateFulfillment(created.id, { step: type, carrier, tracking, note: "" });
    if (!r.ok) return { error: r.error };
  }

  const order = await getOrderById(created.id);
  if (!order) return { error: "No se pudo crear el pedido. Intenta de nuevo." };
  const mail =
    type === "confirmada" ? buyerPaidEmail(order)
    : type === "en_camino" ? buyerOnTheWayEmail(order)
    : type === "recibido" ? buyerReceivedEmail(order)
    : type === "verificado" ? buyerVerifiedEmail(order)
    : type === "despachado" ? buyerShippedEmail(order)
    : buyerDeliveredEmail(order);
  if (type === "confirmada") await markEmailed(order.id);
  const sent = await sendEmail({ to: order.buyerEmail, subject: mail.subject, body: mail.body }).catch(() => ({ ok: false as const }));

  revalidatePath("/admin/pedidos");
  redirect(`/admin/pedidos?ok=${encodeURIComponent(order.reference)}&g=4&m=${sent.ok ? "1" : "0"}#${order.reference}`);
}
