import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByRef, type CatalogOrder } from "@/lib/catalog-orders";
import { DIRECT_CARRIER, shortDay } from "@/lib/fulfillment-shared";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Estado de tu pedido",
  description: "Mira en qué va tu pedido de Pitsneakers.",
  robots: { index: false, follow: false },
};

// El estado cambia cuando el equipo despacha: siempre se lee de la base de datos.
export const dynamic = "force-dynamic";

interface Step {
  title: string;
  detail: string;
  done: boolean;
  current: boolean;
}

/** Pasos que ve el comprador, a partir del seguimiento que lleva el equipo. */
function stepsFor(o: CatalogOrder): Step[] {
  const f = o.fulfillment;
  const shipped = f === "despachado" || f === "entregado" || (f === "incidencia" && o.shippedAt !== null);
  const delivered = f === "entregado";
  const preparing = f === "preparando" || shipped;
  const direct = o.carrier === DIRECT_CARRIER;

  return [
    { title: "Pago recibido", detail: o.paidAt ? shortDay(o.paidAt) : "", done: true, current: !preparing && !shipped },
    {
      title: "Verificando y empacando",
      detail: "Revisamos tu par y lo dejamos listo para salir.",
      done: preparing,
      current: f === "preparando",
    },
    {
      title: "Despachado",
      detail: shipped
        ? [o.shippedAt ? shortDay(o.shippedAt) : "", o.carrier ? `por ${o.carrier}` : ""].filter(Boolean).join(" · ") + (direct ? " · te escribimos para coordinar la entrega" : "")
        : "Te avisamos por correo con el número de guía.",
      done: shipped,
      current: f === "despachado",
    },
    { title: "Entregado", detail: delivered && o.deliveredAt ? shortDay(o.deliveredAt) : "", done: delivered, current: false },
  ];
}

export default async function PedidoPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const reference = decodeURIComponent(ref).trim().toUpperCase();
  const order = /^PITS-[A-Z0-9]{7}$/.test(reference) ? await getOrderByRef(reference) : null;
  const wa = buildGeneralWhatsAppLink(`Hola! Quiero consultar mi pedido ${reference}.`);

  if (!order || order.status !== "pagado") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Tu pedido</p>
        <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">No lo encontramos</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          {order
            ? "Todavía no recibimos el pago de este pedido. Si ya pagaste, puede tardar unos minutos en confirmarse."
            : "Revisa que la referencia esté completa (empieza por PITS- y viene en el correo de tu compra)."}
        </p>
        <a href={wa} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:bg-ink/85">
          Escribirnos por WhatsApp
        </a>
      </div>
    );
  }

  const steps = stepsFor(order);
  const incident = order.fulfillment === "incidencia";
  const hasGuide = !!order.tracking && order.carrier !== DIRECT_CARRIER;
  const tracked = order.fulfillment !== "";

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Tu pedido</p>
      <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">{order.fulfillment === "entregado" ? "Tu pedido llegó" : "¿En qué va tu pedido?"}</h1>
      <p className="mt-2 font-mono text-sm text-muted">{order.reference}</p>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-paper-raised p-4">
        {order.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.image} alt="" className="h-20 w-20 flex-none rounded-xl bg-paper object-cover" />
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold">{`${order.brand} ${order.productName}`.replace(/^(\S+) \1 /, "$1 ")}</p>
          <p className="text-sm text-muted">{order.size && order.size !== "Única" ? `Talla ${order.size} · ` : ""}{order.condition}</p>
        </div>
      </div>

      {incident ? (
        <p className="mt-5 rounded-xl bg-accent/10 px-4 py-3 text-sm">
          Estamos revisando algo con tu pedido. Te escribimos por WhatsApp para resolverlo; si prefieres, escríbenos tú.
        </p>
      ) : null}

      {tracked ? (
        <ol className="mt-6 space-y-0">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-accent text-white" : "border border-line text-muted"} ${s.current ? "ring-4 ring-accent/20" : ""}`}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                {i < steps.length - 1 ? <span className={`my-1 w-px flex-1 ${s.done ? "bg-accent" : "bg-line"}`} /> : null}
              </div>
              <div className="pb-6">
                <p className={`font-semibold ${s.done ? "" : "text-muted"}`}>{s.title}</p>
                {s.detail ? <p className="text-sm text-muted">{s.detail}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 rounded-xl border border-line bg-paper-raised px-4 py-3 text-sm text-muted">
          Recibimos tu pago{order.paidAt ? ` el ${shortDay(order.paidAt)}` : ""}. Un asesor te escribe por WhatsApp para coordinar el envío.
        </p>
      )}

      {hasGuide ? (
        <div className="rounded-xl border border-line bg-paper-raised p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Guía de {order.carrier || "la transportadora"}</p>
          <p className="mt-1 select-all font-mono text-lg font-semibold">{order.tracking}</p>
          <p className="mt-1 text-xs text-muted">Con este número consultas el recorrido en la página de la transportadora.</p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <a href={wa} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:bg-ink/85">
          ¿Dudas? Escríbenos
        </a>
        {order.fulfillment === "entregado" ? (
          <Link href={`/resena?ref=${order.reference}`} className="inline-flex rounded-full border border-line px-6 py-3 text-xs font-semibold uppercase tracking-wide hover:border-ink">
            Dejar mi reseña
          </Link>
        ) : null}
      </div>
    </div>
  );
}
