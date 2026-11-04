import "server-only";
import { getDb } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { formatPrice } from "@/lib/format";
import type { CatalogOrder } from "@/lib/catalog-orders";
import type { BuyerOffer } from "@/lib/buyer-offers";

/** Avisos push de cada evento de la tienda. Todos son "dispara y olvida": nunca lanzan error ni frenan la acción que los origina. */

export type OrderPushStep = "confirmada" | "en_camino" | "recibido" | "verificado" | "despachado" | "entregado";

const ORDER_TEXT: Record<OrderPushStep, (name: string) => { title: string; body: string }> = {
  confirmada: (n) => ({ title: "Compra confirmada ✅", body: `Recibimos tu pago por ${n}.` }),
  en_camino: (n) => ({ title: "Tu par va a verificación", body: `${n} viene en camino a nuestro punto de verificación.` }),
  recibido: (n) => ({ title: "Recibimos tu par 📦", body: `${n} ya está en nuestro punto de verificación.` }),
  verificado: (n) => ({ title: "Tu par fue verificado ✅", body: `${n} pasó el Pits Enigma Verification Process.` }),
  despachado: (n) => ({ title: "Tu pedido va en camino 🚚", body: `${n} ya salió. Mira la guía en tu pedido.` }),
  entregado: (n) => ({ title: "Tu pedido llegó 🎉", body: `${n} fue entregado. ¡A estrenar!` }),
};

/** Avisa al comprador de un pedido, si tiene cuenta y la app instalada (se liga por el correo del pedido). */
export async function pushOrderStep(order: CatalogOrder, step: OrderPushStep): Promise<void> {
  try {
    const db = await getDb();
    const r = await db.execute({ sql: "SELECT id FROM buyers WHERE email = ?", args: [order.buyerEmail.trim().toLowerCase()] });
    if (!r.rows[0]) return;
    const name = `${order.brand} ${order.productName}`.trim().replace(/^(\S+) \1 /, "$1 ");
    await sendPush({ buyerIds: [Number(r.rows[0].id)] }, { ...ORDER_TEXT[step](name), url: `/pedido/${order.reference}` });
  } catch (e) {
    console.error("[push] pedido:", e);
  }
}

/** Avisa al comprador de que el dueño respondió su oferta. */
export async function pushOfferAnswer(o: BuyerOffer, kind: "aceptada" | "rechazada" | "contraoferta"): Promise<void> {
  const name = o.productName;
  const msg =
    kind === "aceptada"
      ? { title: "¡Aceptaron tu oferta! 🔥", body: `${name}: tienes ${o.payHours} h para pagarla.` }
      : kind === "contraoferta"
        ? { title: "Te respondieron con una contraoferta", body: `${name}: ${formatPrice(o.counterAmount)}. Míralo en tus ofertas.` }
        : { title: "Respondieron tu oferta", body: `${name}: esta vez no pudo ser. Mira el detalle en tus ofertas.` };
  await sendPush({ buyerIds: [o.buyerId] }, { ...msg, url: "/cuenta/ofertas" }).catch(() => undefined);
}

/** Avisa a quien iba ganando un par de la subasta que lo superaron. */
export async function pushOutbid(waitlistId: number, item: string, amount: number): Promise<void> {
  await sendPush({ waitlistIds: [waitlistId] }, { title: "¡Te superaron! ⚡", body: `${item} va en ${formatPrice(amount)}. Puja de nuevo antes de que cierre.`, url: "/subasta" }).catch(() => undefined);
}

/**
 * Recordatorio de la trivia: una sola vez por juego, el mismo día en que empieza (la tarea diaria lo llama por la mañana).
 * Devuelve cuántos avisos salieron.
 */
export async function pushTriviaReminder(now = Date.now()): Promise<number> {
  try {
    const db = await getDb();
    const r = await db.execute({
      sql: "SELECT id, title, starts_at FROM trivia_games WHERE published = 1 AND push_sent = 0 AND starts_at > ? AND starts_at <= ? ORDER BY starts_at LIMIT 1",
      args: [now, now + 20 * 60 * 60 * 1000],
    });
    const g = r.rows[0];
    if (!g) return 0;
    // Se marca antes de enviar: si la tarea corre dos veces seguidas, el aviso no sale doble.
    const claim = await db.execute({ sql: "UPDATE trivia_games SET push_sent = 1 WHERE id = ? AND push_sent = 0", args: [Number(g.id)] });
    if (claim.rowsAffected === 0) return 0;
    const at = new Date(Number(g.starts_at)).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
    const res = await sendPush({ all: true }, { title: "Hoy es la trivia 🧠", body: `Empieza a las ${at}. Responde bien y gana crédito para tu próxima compra.`, url: "/trivia" });
    return res.sent;
  } catch (e) {
    console.error("[push] trivia:", e);
    return 0;
  }
}
