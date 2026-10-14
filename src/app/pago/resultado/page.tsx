import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByRef, type OrderStatus } from "@/lib/catalog-orders";
import { isDbConfigured } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Estado de tu pago", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const COPY: Record<OrderStatus, { emoji: string; title: string; text: string }> = {
  pagado: { emoji: "🎉", title: "¡Pago recibido!", text: "Te mandamos el comprobante a tu correo. Un asesor te escribe por WhatsApp para coordinar el envío." },
  pendiente: { emoji: "⏳", title: "Estamos confirmando tu pago", text: "Algunos pagos (PSE, Nequi) tardan unos minutos en confirmarse. Esta página se actualiza sola; también te llega un correo cuando quede listo." },
  rechazado: { emoji: "⚠️", title: "El pago no se completó", text: "Tu banco o tarjeta rechazó el pago y no se cobró nada. Puedes intentarlo de nuevo con otro medio." },
  anulado: { emoji: "↩️", title: "El pago fue anulado", text: "No se hizo ningún cobro. Si crees que es un error, escríbenos." },
  error: { emoji: "⚠️", title: "Hubo un problema con el pago", text: "Escríbenos con tu referencia y lo revisamos de inmediato." },
};

export default async function ResultadoPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref = "" } = await searchParams;
  const order = isDbConfigured() && /^PITS-[A-Z0-9]{7}$/.test(ref) ? await getOrderByRef(ref) : null;

  if (!order) {
    return (
      <section className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-4xl" aria-hidden="true">🔎</p>
        <h1 className="mt-3 font-display text-4xl tracking-wide">No encontramos ese pedido</h1>
        <p className="mt-2 text-sm text-muted">Revisa el enlace o escríbenos por WhatsApp.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">Volver al inicio</Link>
      </section>
    );
  }

  const c = COPY[order.status];
  const wa = buildGeneralWhatsAppLink(`Hola! Mi pedido es ${order.reference} (${order.productName}${order.size ? ` talla ${order.size}` : ""}).`);
  return (
    <section className="mx-auto max-w-lg px-4 py-14 text-center sm:py-20">
      {order.status === "pendiente" && <meta httpEquiv="refresh" content="8" />}
      <p className="text-5xl" aria-hidden="true">{c.emoji}</p>
      <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">{c.title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{c.text}</p>
      <div className="mt-6 rounded-2xl border border-line bg-paper-raised p-5 text-left text-sm">
        <p className="font-semibold">{order.brand} {order.productName}</p>
        <p className="text-muted">{order.size && order.size !== "Única" ? `Talla ${order.size} · ` : ""}{formatPrice(order.amount)}</p>
        <p className="mt-3 text-xs uppercase tracking-wider text-muted">Referencia</p>
        <p className="font-mono text-base font-semibold tracking-wider">{order.reference}</p>
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
        <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-accent px-7 py-3.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110">Escribirnos por WhatsApp</a>
        <Link href="/sneakers" className="text-sm font-semibold underline underline-offset-4 hover:text-accent">Seguir viendo pares</Link>
      </div>
    </section>
  );
}
