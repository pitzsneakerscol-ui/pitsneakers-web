import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { refreshIfStale } from "@/lib/tracking-sync";
import { getOrderByRef } from "@/lib/catalog-orders";
import { shortDay } from "@/lib/fulfillment-shared";
import { stepsFor } from "@/lib/order-steps";
import { VERIF_CHECKS, isVerified } from "@/lib/verification-shared";
import { getAllGroups } from "@/lib/products";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Estado de tu pedido",
  description: "Mira en qué va tu pedido de Pitsneakers.",
  robots: { index: false, follow: false },
};

// El estado cambia cuando el equipo despacha o la transportadora avisa: siempre se lee de la base de datos.
export const dynamic = "force-dynamic";

const longDay = (ms: number) => new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });

export default async function PedidoPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const reference = decodeURIComponent(ref).trim().toUpperCase();
  const order = /^PITS-[A-Z0-9]{7}$/.test(reference) ? await getOrderByRef(reference) : null;
  const wa = buildGeneralWhatsAppLink(`Hola! Quiero consultar mi pedido ${reference}.`);
  // Si el pedido va en camino, se le pregunta a la transportadora sin hacer esperar al cliente (lo ve al recargar).
  if (order) after(() => refreshIfStale(order));

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
  const verified = isVerified(order.verifChecks);

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

      {verified ? (
        <section className="mt-2 rounded-xl border border-line bg-paper-raised p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Pits Enigma Verification Process</p>
          <h2 className="mt-1 font-display text-2xl tracking-wide">Tu par fue verificado</h2>
          {order.verifAt ? <p className="text-sm text-muted">{shortDay(order.verifAt)}</p> : null}
          <ul className="mt-3 space-y-2">
            {VERIF_CHECKS.filter((c) => order.verifChecks.includes(c.key)).map((c) => (
              <li key={c.key} className="flex gap-2.5 text-sm">
                <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">✓</span>
                <span>
                  <span className="font-semibold">{c.label}</span>
                  {c.key === "autentico" ? null : <span className="block text-xs text-muted">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
