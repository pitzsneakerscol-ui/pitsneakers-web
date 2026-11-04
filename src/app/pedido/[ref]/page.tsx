import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByRef, type CatalogOrder } from "@/lib/catalog-orders";
import { DIRECT_CARRIER } from "@/lib/fulfillment-shared";
import { getAllGroups } from "@/lib/products";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Estado de tu pedido",
  description: "Mira en qué va tu pedido de Pitsneakers.",
  robots: { index: false, follow: false },
};

// El estado cambia cuando el equipo despacha: siempre se lee de la base de datos.
export const dynamic = "force-dynamic";

const longDay = (ms: number) => new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
const shortDay = (ms: number) => new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });

interface Step {
  title: string;
  text: string;
  /** dato destacado debajo del texto (guía, fecha) */
  extra?: string;
  done: boolean;
}

/** Pasos que ve el comprador, con una explicación debajo de cada uno, a partir del seguimiento que lleva el equipo. */
function stepsFor(o: CatalogOrder): Step[] {
  const f = o.fulfillment;
  const shipped = f === "despachado" || f === "entregado" || (f === "incidencia" && o.shippedAt !== null);
  const delivered = f === "entregado";
  const preparing = f === "preparando" || shipped;
  const direct = o.carrier === DIRECT_CARRIER;

  return [
    {
      title: "Pedido confirmado",
      text: "¡Listo! Recibimos tu pago y tu pedido está confirmado.",
      extra: o.paidAt ? shortDay(o.paidAt) : undefined,
      done: true,
    },
    {
      title: "Verificado y empacado",
      text: shipped
        ? "Revisamos tu par a fondo y lo dejamos empacado."
        : preparing
          ? "Estamos revisando tu par y empacándolo con cuidado."
          : "Cada par pasa por revisión física y autenticación antes de salir.",
      done: shipped,
    },
    {
      title: direct ? "Entrega coordinada" : "Entregado a la transportadora",
      text: shipped
        ? direct
          ? "Lo entregamos directamente: te escribimos por WhatsApp para coordinar."
          : `Tu pedido salió con ${o.carrier || "la transportadora"}.${o.tracking ? " Con el número de guía puedes ver el recorrido en su página." : ""}`
        : "Cuando salga te mandamos la guía por correo.",
      extra: shipped ? [o.shippedAt ? shortDay(o.shippedAt) : "", !direct && o.tracking ? `Guía ${o.tracking}` : ""].filter(Boolean).join(" · ") || undefined : undefined,
      done: shipped,
    },
    {
      title: "Entregado en tu dirección",
      text: delivered ? "Tu pedido llegó. ¡A estrenar!" : `Cuando lo tengas, etiquétanos en Instagram ${siteConfig.instagramHandle}: nos encanta ver tus pares.`,
      extra: delivered && o.deliveredAt ? shortDay(o.deliveredAt) : undefined,
      done: delivered,
    },
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

  // Enlace al producto y su colorway, si el par sigue publicado.
  const group = await getAllGroups()
    .then((gs) => gs.find((g) => g.variants.some((v) => v.id === order.productId)))
    .catch(() => undefined);
  const name = `${order.brand} ${order.productName}`.replace(/^(\S+) \1 /, "$1 ");
  const colorway = group?.colorway && !name.toLowerCase().includes(group.colorway.toLowerCase()) ? group.colorway : "";

  const steps = stepsFor(order);
  const incident = order.fulfillment === "incidencia";
  const tracked = order.fulfillment !== "";
  // El primer paso sin completar es el "actual".
  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl tracking-wide sm:text-4xl">{order.fulfillment === "entregado" ? "Tu pedido llegó" : "Tu pedido"}</h1>

      <dl className="mt-5 divide-y divide-line border-y border-line text-sm">
        <div className="flex justify-between gap-4 py-3">
          <dt className="font-semibold">Fecha del pedido</dt>
          <dd className="text-muted">{longDay(order.paidAt ?? order.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="font-semibold">Referencia</dt>
          <dd className="select-all font-mono text-muted">{order.reference}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center gap-4">
        {order.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.image} alt="" className="h-24 w-24 flex-none rounded-xl bg-paper-raised object-cover" />
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{name}</p>
          {colorway ? <p className="text-sm text-muted">{colorway}</p> : null}
          <p className="mt-1 inline-block rounded-md border border-line px-2 py-0.5 text-xs font-semibold">
            {order.size && order.size !== "Única" ? `Talla: ${order.size}` : "Talla única"} · {order.condition}
          </p>
          {group ? (
            <p className="mt-2">
              <Link href={`/producto/${group.groupSlug}`} className="text-sm font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                Ver producto
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <h2 className="mt-8 font-display text-2xl tracking-wide">Estado del pedido</h2>

      {incident ? (
        <p className="mt-3 rounded-xl bg-accent/10 px-4 py-3 text-sm">
          Estamos revisando algo con tu pedido. Te escribimos por WhatsApp para resolverlo; si prefieres, escríbenos tú.
        </p>
      ) : null}

      {tracked ? (
        <ol className="mt-5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${s.done ? "bg-emerald-600 text-white" : "border-2 border-line bg-paper"} ${i === currentIdx && !incident ? "ring-4 ring-emerald-600/15" : ""}`}
                >
                  {s.done ? "✓" : ""}
                </span>
                {i < steps.length - 1 ? <span className={`my-1 w-0.5 flex-1 ${s.done && steps[i + 1].done ? "bg-emerald-600" : "bg-line"}`} /> : null}
              </div>
              <div className="min-w-0 pb-7">
                <p className={`font-semibold leading-tight ${s.done || i === currentIdx ? "" : "text-muted"}`}>
                  {s.title}
                  <span className="sr-only">{s.done ? " (completado)" : i === currentIdx ? " (en curso)" : " (pendiente)"}</span>
                </p>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
                {s.extra ? <p className="mt-1 select-all text-sm font-semibold">{s.extra}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl border border-line bg-paper-raised px-4 py-3 text-sm text-muted">
          Recibimos tu pago{order.paidAt ? ` el ${shortDay(order.paidAt)}` : ""}. Un asesor te escribe por WhatsApp para coordinar el envío.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
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
