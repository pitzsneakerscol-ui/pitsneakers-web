"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rateLimitHit, requireAdmin } from "@/lib/auth";
import { createOrder, markEmailed, markManualPaid } from "@/lib/catalog-orders";
import { getAllProducts } from "@/lib/products";
import { isEmail } from "@/lib/reseller-shared";
import { parseShipping } from "@/lib/shipping-shared";
import { buyerPaidEmail } from "@/lib/order-emails";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { SALE_METHODS, SALE_STEPS, type SaleState } from "@/lib/sale-shared";

const clean = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Registra una venta cerrada por WhatsApp: crea el pedido con el par del catálogo (foto incluida), lo deja pagado y le manda
 * al cliente el mismo correo y seguimiento que recibe quien compra en la página. El precio lo pones tú (el acordado con el cliente).
 */
export async function registerSale(_prev: SaleState, fd: FormData): Promise<SaleState> {
  await requireAdmin();

  const p = (await getAllProducts()).find((x) => x.id === clean(fd, "productId", 80));
  if (!p) return { error: "Elige el par de la lista." };
  const size = clean(fd, "size", 30);
  const sizeOk = p.sizes.length === 0 ? size === "Única" || size === "" : p.sizes.includes(size);
  if (!sizeOk) return { error: "Elige una talla del par." };

  const amount = Number(clean(fd, "amount", 12).replace(/\D/g, ""));
  if (!Number.isInteger(amount) || amount < 10_000 || amount > 50_000_000) return { error: "Escribe el precio acordado en pesos (por ejemplo 450000)." };

  const name = clean(fd, "name", 80);
  const email = clean(fd, "email", 120).toLowerCase();
  const phone = clean(fd, "phone", 20).replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
  if (name.length < 3 || !name.includes(" ")) return { error: "Escribe el nombre y apellido del cliente." };
  if (!isEmail(email)) return { error: "Escribe un correo válido: ahí le llega el proceso de su pedido." };
  if (!/^3\d{9}$/.test(phone)) return { error: "Escribe el celular de 10 dígitos (empieza por 3)." };
  const ship = parseShipping(fd);
  if ("error" in ship) return { error: ship.error };

  const methodRaw = clean(fd, "method", 20);
  const method = (SALE_METHODS as readonly string[]).includes(methodRaw) ? methodRaw : "Otro";
  const step = SALE_STEPS.find(([k]) => k === clean(fd, "step", 30))?.[0] ?? "por_preparar";

  // Evita registrar la misma venta dos veces por un doble clic.
  if (!(await rateLimitHit(`venta-manual:${p.id}:${email}`, 1, 30_000))) return { error: "Esa venta ya se registró hace un momento. Revisa la lista de pedidos." };

  const created = await createOrder({
    productId: p.id,
    productName: p.name,
    brand: p.brand,
    size: size || "Única",
    condition: p.condition,
    image: p.images[0] ?? "",
    amount,
    creditCode: "",
    discount: 0,
    fee: 0,
    buyerName: name,
    buyerEmail: email,
    buyerPhone: phone,
    buyerCity: ship.data.city,
    shipDepartment: ship.data.department,
    shipAddress: ship.data.address,
    shipComplement: ship.data.complement,
    shipDocument: ship.data.document,
    shipNotes: ship.data.notes,
  });
  const order = await markManualPaid(created.id, `WhatsApp · ${method}`, step);
  if (!order) return { error: "No se pudo registrar la venta. Intenta de nuevo." };

  let emailed = "";
  if (fd.get("notify") === "on" && isEmailConfigured() && (await markEmailed(order.id))) {
    const mail = buyerPaidEmail(order);
    const sent = await sendEmail({ to: order.buyerEmail, subject: mail.subject, body: mail.body }).catch(() => ({ ok: false as const }));
    emailed = sent.ok ? "1" : "0";
  }

  revalidatePath("/admin/pedidos");
  redirect(`/admin/pedidos?ok=${encodeURIComponent(order.reference)}&g=4${emailed ? `&m=${emailed}` : ""}`);
}
