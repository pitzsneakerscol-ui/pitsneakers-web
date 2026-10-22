"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clientIp, rateLimitHit } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { sendEmail } from "@/lib/email";
import { getBuyer, updateProfile } from "@/lib/buyers";
import { getAllProducts } from "@/lib/products";
import { acceptCounter, attachOrder, createBuyerOffer, getBuyerOffer, withdrawOffer } from "@/lib/buyer-offers";
import { counterAnsweredTeamEmail, offerToTeamEmail } from "@/lib/buyer-emails";
import { createOrder } from "@/lib/catalog-orders";
import { processingFee } from "@/lib/fees";
import { buildCheckoutUrl, isWompiConfigured } from "@/lib/wompi";
import { rejectOffer } from "@/lib/buyer-offers";
import { getPerks } from "@/lib/perks";
import { feeAfterPerk } from "@/lib/leagues";
import { parseShipping } from "@/lib/shipping-shared";

export type OfferState = { error?: string; ok?: boolean; message?: string } | undefined;

const clean = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** El comprador hace una oferta por un par. Solo con cuenta y correo verificado. */
export async function makeOffer(_prev: OfferState, fd: FormData): Promise<OfferState> {
  try {
    if (!isDbConfigured()) return { error: "Las ofertas aún no están disponibles." };
    const buyer = await getBuyer();
    if (!buyer) return { error: "Inicia sesión para hacer una oferta." };
    if (!buyer.verified) return { error: "Confirma tu correo primero: te enviamos un enlace. Puedes reenviarlo desde tu cuenta." };
    const ip = await clientIp();
    if (!(await rateLimitHit(`oferta:${buyer.id}`, 10, 60 * 60 * 1000)) || !(await rateLimitHit(`oferta-ip:${ip}`, 30, 60 * 60 * 1000))) {
      return { error: "Hiciste muchas ofertas seguidas. Espera un rato." };
    }
    const productId = clean(fd, "productId", 60);
    const size = clean(fd, "size", 30);
    const amount = Math.round(Number(clean(fd, "amount", 15).replace(/\D/g, "")));
    const product = (await getAllProducts()).find((p) => p.id === productId);
    if (!product) return { error: "No encontramos ese par. Recarga la página." };
    const sizeOk = product.sizes.length === 0 ? size === "Única" || size === "" : product.sizes.includes(size);
    if (!sizeOk) return { error: "Esa talla ya no está disponible. Elige otra." };

    const { league, perks } = await getPerks(buyer);
    const res = await createBuyerOffer(buyer, product, size || "Única", amount, { minOfferPct: perks.minOfferPct, payHours: perks.payHours, priority: perks.priority, leagueLabel: league.label });
    if (!res.ok) return { error: res.error };
    const team = offerToTeamEmail(res.offer);
    await sendEmail({ to: siteConfig.contactEmail, subject: team.subject, body: team.body, replyTo: buyer.email }).catch(() => undefined);
    revalidatePath("/cuenta/ofertas");
    return { ok: true, message: `Oferta enviada. Te respondemos en máximo ${siteConfig.offers.replyHours} horas; la ves en Mi cuenta → Ofertas.` };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[ofertas] crear:", e);
    return { error: "No pudimos enviar tu oferta. Intenta de nuevo." };
  }
}

/** Aceptar o rechazar una contraoferta, o retirar una oferta. */
export async function answerOffer(fd: FormData): Promise<void> {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  const id = Number(fd.get("id"));
  const decision = String(fd.get("decision") ?? "");
  if (!Number.isInteger(id) || id <= 0) return;
  if (decision === "aceptar") {
    if (await acceptCounter(buyer.id, id)) {
      const o = await getBuyerOffer(id);
      if (o) {
        const t = counterAnsweredTeamEmail(o, true);
        await sendEmail({ to: siteConfig.contactEmail, subject: t.subject, body: t.body, replyTo: buyer.email }).catch(() => undefined);
      }
    }
  } else if (decision === "rechazar") {
    const o = await getBuyerOffer(id);
    if (o && o.buyerId === buyer.id && o.status === "contraoferta" && (await rejectOffer(id, "El comprador rechazó la contraoferta."))) {
      const t = counterAnsweredTeamEmail(o, false);
      await sendEmail({ to: siteConfig.contactEmail, subject: t.subject, body: t.body, replyTo: buyer.email }).catch(() => undefined);
    }
  } else if (decision === "retirar") {
    await withdrawOffer(buyer.id, id);
  }
  revalidatePath("/cuenta/ofertas");
}

/** Paga una oferta aceptada: crea el pedido al precio acordado (más el costo del pago en línea) y manda a Wompi. */
export async function payOffer(_prev: OfferState, fd: FormData): Promise<OfferState> {
  let url: string;
  try {
    if (!isDbConfigured() || !isWompiConfigured()) return { error: "El pago en línea aún no está disponible. Escríbenos por WhatsApp y te ayudamos." };
    const buyer = await getBuyer();
    if (!buyer) return { error: "Inicia sesión de nuevo." };
    const id = Number(fd.get("id"));
    const offer = Number.isInteger(id) ? await getBuyerOffer(id) : null;
    if (!offer || offer.buyerId !== buyer.id) return { error: "No encontramos esa oferta." };
    if (offer.status !== "aceptada") return { error: "Esta oferta ya no se puede pagar (venció o ya se pagó)." };
    const ip = await clientIp();
    if (!(await rateLimitHit(`oferta-pago:${ip}`, 12, 60 * 60 * 1000))) return { error: "Hiciste muchos intentos seguidos. Espera un rato." };

    const name = clean(fd, "name", 80) || buyer.name;
    const phone = clean(fd, "phone", 20).replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
    if (name.length < 3 || !name.includes(" ")) return { error: "Escribe tu nombre y apellido." };
    if (!/^3\d{9}$/.test(phone)) return { error: "Escribe tu celular de 10 dígitos (empieza por 3)." };
    const ship = parseShipping(fd);
    if ("error" in ship) return { error: ship.error };
    const city = ship.data.city;

    // El par debe seguir publicado con esa talla (si ya se vendió, no se cobra).
    const product = (await getAllProducts()).find((p) => p.id === offer.productId);
    const sizeOk = product && (product.sizes.length === 0 ? offer.size === "Única" || offer.size === "" : product.sizes.includes(offer.size));
    if (!product || !sizeOk) return { error: "Este par ya no está disponible. Escríbenos por WhatsApp y lo resolvemos." };

    const base = offer.agreedAmount;
    const { perks } = await getPerks(buyer);
    const fee = feeAfterPerk(processingFee(base), perks.feeDiscountPct);
    const order = await createOrder({
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      size: offer.size || "Única",
      condition: product.condition,
      image: product.images[0] ?? offer.image,
      amount: base + fee,
      creditCode: "",
      discount: 0,
      fee,
      buyerName: name,
      buyerEmail: buyer.email,
      buyerPhone: phone,
      buyerCity: city,
      shipDepartment: ship.data.department,
      shipAddress: ship.data.address,
      shipComplement: ship.data.complement,
      shipDocument: ship.data.document,
      shipNotes: ship.data.notes,
    });
    await attachOrder(offer.id, order.reference);
    await updateProfile(buyer.id, { name, phone, city });
    url = buildCheckoutUrl({ reference: order.reference, amountCop: order.amount, email: buyer.email, name, phone });
  } catch (e) {
    unstable_rethrow(e);
    console.error("[ofertas] pagar:", e);
    return { error: "No pudimos iniciar el pago. Intenta de nuevo en unos minutos." };
  }
  redirect(url);
}
