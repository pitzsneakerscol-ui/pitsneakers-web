import { applyTransaction, markEmailed } from "@/lib/catalog-orders";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { pushOrderStep } from "@/lib/push-events";
import { buyerPaidEmail, teamPaidEmail } from "@/lib/order-emails";
import { siteConfig } from "@/config/site";
import { isWompiTest, verifyEvent, type WompiEvent } from "@/lib/wompi";
import { sendMetaEvent } from "@/lib/meta";
import { feedItemId } from "@/lib/meta-client";

export const dynamic = "force-dynamic";

/** Wompi avisa aquí cada vez que cambia el estado de un pago (configúralo en el panel de Wompi → Desarrolladores → Eventos). */
export async function POST(request: Request) {
  if (!isDbConfigured()) return new Response("no-disponible", { status: 503 });
  let event: WompiEvent;
  try {
    event = (await request.json()) as WompiEvent;
  } catch {
    return new Response("json-invalido", { status: 400 });
  }
  if (!verifyEvent(event, request.headers.get("x-event-checksum"))) return new Response("firma-invalida", { status: 401 });

  const tx = event.data?.transaction;
  if (event.event !== "transaction.updated" || !tx?.reference) return new Response("ok", { status: 200 });

  const res = await applyTransaction({ reference: tx.reference, id: tx.id, status: tx.status, amountCents: Number(tx.amount_in_cents), method: tx.payment_method_type });
  if (!res) return new Response("pedido-desconocido", { status: 200 });

  if (res.justPaid && isEmailConfigured() && (await markEmailed(res.order.id))) {
    const buyer = buyerPaidEmail(res.order);
    const team = teamPaidEmail(res.order, isWompiTest());
    await Promise.allSettled([
      sendEmail({ to: res.order.buyerEmail, subject: buyer.subject, body: buyer.body }),
      sendEmail({ to: siteConfig.contactEmail, subject: team.subject, body: team.body, replyTo: res.order.buyerEmail }),
    ]);
  }
  if (res.justPaid) await pushOrderStep(res.order, "confirmada");
  // Meta: la compra se avisa desde el servidor (no depende de que el cliente vuelva al sitio). El píxel de /pago/resultado usa el mismo
  // id de evento, así Meta la cuenta una sola vez. Los pagos de prueba no se cuentan.
  if (res.justPaid && !isWompiTest()) {
    const o = res.order;
    await sendMetaEvent({
      name: "Purchase",
      id: `purchase-${o.reference}`,
      url: `${siteConfig.siteUrl}/pago/resultado?ref=${o.reference}`,
      user: { email: o.buyerEmail, phone: o.buyerPhone, name: o.buyerName, city: o.buyerCity },
      custom: { currency: "COP", value: o.amount, order_id: o.reference, content_type: "product", content_ids: [feedItemId(o.productId, o.size)], num_items: 1 },
    });
  }
  return new Response("ok", { status: 200 });
}
