"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { clientIp, rateLimitHit } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { createOrder } from "@/lib/catalog-orders";
import { getAllProducts } from "@/lib/products";
import { isEmail } from "@/lib/reseller-shared";
import { buildCheckoutUrl, isWompiConfigured } from "@/lib/wompi";
import { checkCredit, reserveCredit } from "@/lib/trivia";
import { processingFee } from "@/lib/fees";

export type CheckoutState = { error?: string } | undefined;

const clean = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Crea el pedido y manda al cliente a pagar en Wompi.
 * El precio sale siempre del catálogo en el servidor: lo que llegue del navegador no se usa para cobrar.
 */
export async function startCheckout(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  let url: string;
  try {
    if (!isDbConfigured() || !isWompiConfigured()) return { error: "El pago en línea aún no está disponible. Escríbenos por WhatsApp y te ayudamos." };
    if (clean(fd, "website", 50) !== "") return { error: "No pudimos procesar tu pedido." };

    const name = clean(fd, "name", 80);
    const email = clean(fd, "email", 120).toLowerCase();
    const phone = clean(fd, "phone", 20).replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
    const city = clean(fd, "city", 60);
    if (name.length < 3 || !name.includes(" ")) return { error: "Escribe tu nombre y apellido." };
    if (!isEmail(email)) return { error: "Escribe un correo válido: ahí te llega el comprobante." };
    if (!/^3\d{9}$/.test(phone)) return { error: "Escribe tu celular de 10 dígitos (empieza por 3)." };
    if (city.length < 2) return { error: "Escribe tu ciudad." };

    const ip = await clientIp();
    if (!(await rateLimitHit(`checkout:${ip}`, 12, 60 * 60 * 1000))) return { error: "Hiciste muchos intentos seguidos. Espera un rato e intenta de nuevo." };

    const productId = clean(fd, "productId", 60);
    const size = clean(fd, "size", 30);
    const product = (await getAllProducts()).find((p) => p.id === productId);
    if (!product || product.price <= 0) return { error: "No encontramos ese par. Recarga la página e intenta de nuevo." };
    const sizeOk = product.sizes.length === 0 ? size === "Única" || size === "" : product.sizes.includes(size);
    if (!sizeOk) return { error: "Esa talla ya no está disponible. Elige otra." };

    // Crédito (código de premio): descuenta del total, nunca deja el cobro por debajo de $2.000.
    const creditText = clean(fd, "credit", 20).toUpperCase().replace(/\s+/g, "");
    let discount = 0;
    let creditCode = "";
    if (creditText) {
      const chk = await checkCredit(creditText, email, "");
      if (!chk.ok) return { error: chk.error };
      discount = Math.max(0, Math.min(chk.amount ?? 0, product.price - 2000));
      if (discount <= 0) return { error: "Este par es muy barato para usar el crédito." };
      creditCode = creditText;
    }

    // Costo de pago en línea: se calcula sobre lo que realmente se paga (ya con el crédito descontado).
    const base = product.price - discount;
    const fee = processingFee(base);

    const order = await createOrder({
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      size: size || "Única",
      condition: product.condition,
      image: product.images[0] ?? "",
      amount: base + fee,
      creditCode,
      discount,
      fee,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      buyerCity: city,
    });
    if (creditCode) await reserveCredit(creditCode, order.reference);
    url = buildCheckoutUrl({ reference: order.reference, amountCop: order.amount, email, name, phone });
  } catch (e) {
    unstable_rethrow(e);
    console.error("[comprar] error:", e);
    return { error: "No pudimos iniciar el pago. Intenta de nuevo en unos minutos." };
  }
  redirect(url);
}
