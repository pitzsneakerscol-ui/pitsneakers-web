import { applyTransaction, markEmailed } from "@/lib/catalog-orders";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { buyerPaidEmail, teamPaidEmail } from "@/lib/order-emails";
import { siteConfig } from "@/config/site";
import { isWompiTest, verifyEvent, type WompiEvent } from "@/lib/wompi";

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
  return new Response("ok", { status: 200 });
}
