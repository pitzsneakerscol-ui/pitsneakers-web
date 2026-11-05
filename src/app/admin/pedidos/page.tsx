import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { syncTracking, skyStatusLabel } from "@/lib/tracking-sync";
import { backfillSellers, listOrderPhotos, listOrders, type OrderStatus } from "@/lib/catalog-orders";
import { getPayoutInfos, sellerNames } from "@/lib/seller-payout";
import { PAYOUT_CLS, PAYOUT_LABEL, PAYOUT_STATUSES, PAYOUT_WINDOW, payoutDestination } from "@/lib/payout-shared";
import { shippingLine } from "@/lib/shipping-shared";
import { ago } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { isWompiConfigured, isWompiTest } from "@/lib/wompi";
import { siteConfig } from "@/config/site";
import { btnPrimary, cardCls, inputCls, selectAutoCls } from "@/components/reseller/ui";
import { CARRIERS, FULFILLMENT_CLS, FULFILLMENT_LABEL, FULFILLMENT_STEPS, LATE_HOURS, isLate, isToShip } from "@/lib/fulfillment-shared";
import { CARRIER_LABEL, getCredits, isSkydropxConfigured } from "@/lib/skydropx";
import { generateGuide, refreshGuide, removePhoto, saveFulfillment, savePayoutStatus, verifyOrder } from "./actions";
import PhotoPicker from "@/components/admin/PhotoPicker";
import { MAX_PHOTOS, REQUIRED_CHECKS, VERIF_CHECKS, isVerified } from "@/lib/verification-shared";

export const metadata: Metadata = { title: "Pedidos web" };

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pagado: { label: "Pagado", cls: "bg-emerald-100 text-emerald-800" },
  pendiente: { label: "Sin pagar", cls: "bg-amber-100 text-amber-800" },
  rechazado: { label: "Rechazado", cls: "bg-line text-muted" },
  anulado: { label: "Anulado", cls: "bg-line text-muted" },
  error: { label: "Revisar", cls: "bg-accent/10 text-accent" },
};

const FILTERS = [
  ["todos", "Todos"],
  ["por-despachar", "Por despachar"],
  ["despachado", "En camino"],
  ["incidencia", "Incidencias"],
  ["pendiente", "Sin pagar"],
  ["por-pagar", "Pagos a revendedores"],
  ["archivados", "Archivados"],
] as const;

/** Pedido de un par de revendedor cuyo pago todavía no se le hace completo. */
const owesSeller = (o: { status: OrderStatus; sellerId: number | null; payoutStatus: string }) => o.status === "pagado" && Boolean(o.sellerId) && o.payoutStatus !== "pagado";

/** Un pedido pagado y entregado se archiva solo (si era de un revendedor, cuando ya se le pagó): sale de la lista principal y queda en el filtro "Archivados". */
const isArchived = (o: { status: OrderStatus; fulfillment: string; sellerId: number | null; payoutStatus: string }) => o.status === "pagado" && o.fulfillment === "entregado" && !owesSeller(o);

type SP = { f?: string; e?: string; ok?: string; m?: string; g?: string };

/** Saldo de créditos de Skydropx (null si no está conectado o no respondió: el panel sigue funcionando). */
async function skySaldo(): Promise<{ balance: number; currency: string } | null> {
  if (!isSkydropxConfigured()) return null;
  return getCredits().catch(() => null);
}

export default async function PedidosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { f, e, ok, m, g } = await searchParams;
  const sky = isSkydropxConfigured();
  // Pone al día el rastreo de los pedidos en camino sin hacer esperar la página (se ve al recargar).
  if (sky) after(() => syncTracking({ staleMs: 10 * 60_000, limit: 10 }).catch(() => undefined));
  const credits = await skySaldo();
  const filter = FILTERS.some(([k]) => k === f) ? (f as (typeof FILTERS)[number][0]) : "todos";
  await backfillSellers().catch(() => undefined);
  const all = await listOrders();
  const rows = all.filter((o) => {
    switch (filter) {
      case "por-despachar": return o.status === "pagado" && isToShip(o.fulfillment);
      case "despachado": return o.status === "pagado" && o.fulfillment === "despachado";
      case "archivados": return isArchived(o);
      case "incidencia": return o.status === "pagado" && o.fulfillment === "incidencia";
      case "pendiente": return o.status === "pendiente";
      case "por-pagar": return owesSeller(o);
      default: return !isArchived(o);
    }
  });
  const archivedCount = all.filter(isArchived).length;
  const owed = all.filter(owesSeller);
  const owedTotal = owed.reduce((sum, o) => sum + o.payoutAmount, 0);
  const sellerIds = [...new Set(rows.map((o) => o.sellerId).filter((id): id is number => Boolean(id)))];
  const [names, payInfos] = await Promise.all([sellerNames(sellerIds), getPayoutInfos(sellerIds)]);
  const photos = await listOrderPhotos(rows.filter((o) => o.status === "pagado").map((o) => o.id));
  const paid = all.filter((o) => o.status === "pagado");
  const total = paid.reduce((s, o) => s + o.amount, 0);
  const toShip = paid.filter((o) => isToShip(o.fulfillment));
  const late = toShip.filter((o) => isLate(o.fulfillment, o.paidAt, o.createdAt));
  const inTransit = paid.filter((o) => o.fulfillment === "despachado").length;
  const incidents = paid.filter((o) => o.fulfillment === "incidencia").length;
  const configured = isWompiConfigured();
  const base = siteConfig.siteUrl.replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Pedidos web</h1>
          <Link href="/admin/pedidos/nuevo" className={btnPrimary}>Avisar a un cliente de WhatsApp</Link>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Compras que los clientes pagaron en la página con Wompi. Confirma el stock, devuelve el pago desde el panel de Wompi si ya no hay y lleva aquí el envío: al despachar con guía, el cliente recibe el correo y puede ver en qué va su pedido.
        </p>
      </header>

      {e ? <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">{e}</p> : null}
      {ok ? (
        <p role="status" className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">
          Pedido <span className="font-mono">{ok}</span> {g === "1" ? "con guía generada: descarga la etiqueta, pégala al paquete y luego márcalo como despachado." : g === "2" ? "con la guía actualizada." : g === "3" ? "con la verificación guardada." : g === "4" ? "creado para el cliente de WhatsApp. Ya aparece abajo: los siguientes avisos los mandas desde ahí." : g === "5" ? "entregado: se archivó solo. Lo encuentras en “Archivados”." : g === "6" ? "con el pago al revendedor actualizado." : "actualizado."}
          {m === "1" ? " Le avisamos al cliente por correo." : m === "0" ? " No se pudo enviar el correo al cliente: avísale por WhatsApp." : ""}
        </p>
      ) : null}

      <section className={`${cardCls} p-4 text-sm sm:p-5`}>
        <p className="font-semibold">
          Wompi: {configured ? (isWompiTest() ? "conectado en modo de PRUEBAS (no cobra dinero real)" : "conectado en producción") : "sin configurar (el botón “Comprar ahora” está oculto)"}
        </p>
        {!configured && <p className="mt-1 text-muted">Faltan las variables WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET en Vercel.</p>}
        <p className="mt-2 text-muted">
          URL de eventos para el panel de Wompi: <code className="rounded bg-paper px-1.5 py-0.5 text-xs text-ink">{base}/api/wompi/eventos</code>
        </p>
      </section>

      <section className={`${cardCls} p-4 text-sm sm:p-5`}>
        <p className="font-semibold">
          Skydropx ({CARRIER_LABEL}):{" "}
          {!sky ? "sin conectar" : credits ? (
            <>
              créditos disponibles <span className={credits.balance < 60000 ? "text-accent" : ""}>{formatPrice(credits.balance)}</span>
            </>
          ) : "conectado, pero no pude leer el saldo"}
        </p>
        {!sky ? (
          <p className="mt-1 text-muted">Faltan las variables SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET en Vercel (las sacas en Skydropx → Conexiones → API). Mientras tanto puedes pegar la guía a mano.</p>
        ) : (
          <p className="mt-1 text-muted">Cada guía se paga con estos créditos al generarla. Si se acaban, recarga en Skydropx.</p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Por despachar</p>
          <p className="font-display text-4xl tracking-wide text-accent">{toShip.length}</p>
          {late.length > 0 ? <p className="mt-1 text-xs font-semibold text-accent">{late.length} con más de {LATE_HOURS} h</p> : <p className="mt-1 text-xs text-muted">Al día</p>}
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">En camino</p>
          <p className="font-display text-4xl tracking-wide">{inTransit}</p>
          {incidents > 0 ? <p className="mt-1 text-xs font-semibold text-accent">{incidents} con incidencia</p> : null}
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pagados · total cobrado</p>
          <p className="font-display text-4xl tracking-wide">{paid.length}</p>
          <p className="mt-1 text-xs text-muted">{formatPrice(total)}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sin pagar</p>
          <p className="font-display text-4xl tracking-wide">{all.filter((o) => o.status === "pendiente").length}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Por pagar a revendedores</p>
          <p className="font-display text-4xl tracking-wide">{owed.length}</p>
          <p className="mt-1 text-xs text-muted">{formatPrice(owedTotal)}</p>
        </div>
      </div>

      <nav aria-label="Filtrar" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={k === "todos" ? "/admin/pedidos" : `/admin/pedidos?f=${k}`} className={`rounded-full px-4 py-2 ${filter === k ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
            {label}{k === "archivados" ? ` (${archivedCount})` : ""}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>{filter === "todos" ? (archivedCount > 0 ? "No hay pedidos activos. Los entregados están en “Archivados”." : "Sin pedidos todavía.") : filter === "archivados" ? "Aún no hay pedidos entregados." : "No hay pedidos en esta vista."}</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => {
            const st = STATUS[o.status];
            const isPaid = o.status === "pagado";
            const late48 = isPaid && isLate(o.fulfillment, o.paidAt, o.createdAt);
            return (
              <li key={o.id} id={o.reference} className={`${cardCls} p-4 sm:p-5 ${late48 ? "ring-1 ring-accent/60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.brand} {o.productName}</p>
                    <p className="text-xs text-muted">
                      {o.size && o.size !== "Única" ? `Talla ${o.size} · ` : ""}{o.condition} · <span className="font-mono">{o.reference}</span> · {ago(o.paidAt ?? o.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{formatPrice(o.amount)}</strong>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                    {isPaid ? <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${FULFILLMENT_CLS[o.fulfillment]}`}>{FULFILLMENT_LABEL[o.fulfillment]}</span> : null}
                    {o.paymentMethod.startsWith("WhatsApp") ? <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">WhatsApp</span> : null}
                    {late48 ? <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">Atrasado</span> : null}
                  </div>
                </div>
                <p className="mt-2 text-sm">
                  {o.buyerName} · {o.buyerCity} · <a className="underline" href={`mailto:${o.buyerEmail}`}>{o.buyerEmail}</a> ·{" "}
                  <a className="underline" target="_blank" rel="noreferrer" href={`https://wa.me/57${o.buyerPhone.replace(/\D/g, "").slice(-10)}`}>{o.buyerPhone}</a>
                  {o.paymentMethod ? <span className="text-muted"> · {o.paymentMethod}</span> : null}
                  {o.fee > 0 ? <span className="text-muted"> · incluye {formatPrice(o.fee)} de costo de pago</span> : null}
                  {o.discount > 0 ? <span className="text-muted"> · crédito {formatPrice(o.discount)} ({o.creditCode})</span> : null}
                </p>
                {o.shipAddress ? (
                  <p className="mt-1.5 rounded-lg bg-paper px-3 py-2 text-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Enviar a </span>
                    {shippingLine({ department: o.shipDepartment, city: o.buyerCity, address: o.shipAddress, complement: o.shipComplement })}
                    {o.shipDocument ? <span className="text-muted"> · CC {o.shipDocument}</span> : null}
                    {o.shipNotes ? <span className="block text-xs text-muted">Indicaciones: {o.shipNotes}</span> : null}
                  </p>
                ) : null}

                {isPaid && sky && o.shipAddress && !o.skyShipmentId && o.fulfillment !== "entregado" && !o.paymentMethod.startsWith("WhatsApp") ? (
                  <form action={generateGuide} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-line p-3">
                    <input type="hidden" name="id" value={o.id} />
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Código postal de entrega
                      <input name="postal" defaultValue={o.shipPostal} inputMode="numeric" maxLength={8} required autoComplete="off" placeholder="Ej: 050021" className={`${inputCls} mt-1 block w-40 normal-case tracking-normal`} />
                    </label>
                    <button type="submit" className={btnPrimary}>Generar guía {CARRIER_LABEL}</button>
                    <p className="basis-full text-xs text-muted">Cotiza solo con {CARRIER_LABEL}, descuenta el costo de tus créditos de Skydropx y guarda el número de guía y la etiqueta. Tarda unos segundos.</p>
                  </form>
                ) : null}
                {isPaid && o.skyShipmentId ? (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-paper px-3 py-2 text-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Guía Skydropx</span>
                    {o.skyShipmentId === "pending" ? (
                      <span className="text-muted">Generándose… recarga en unos segundos. Si lleva minutos así, revisa en Skydropx y pega la guía a mano abajo.</span>
                    ) : (
                      <>
                        <strong className="font-mono">{o.tracking || "pendiente"}</strong>
                        {o.shipCost > 0 ? <span className="text-muted">costó {formatPrice(o.shipCost)}</span> : null}
                        {o.skyStatus ? <span className="rounded-full bg-line px-2.5 py-0.5 text-xs font-semibold">{skyStatusLabel(o.skyStatus)}{o.trackedAt ? ` · ${ago(o.trackedAt)}` : ""}</span> : null}
                        {o.labelUrl ? (
                          <a href={o.labelUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">Descargar etiqueta (PDF)</a>
                        ) : null}
                        {!o.tracking || !o.labelUrl ? (
                          <form action={refreshGuide}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="text-xs font-semibold underline">Actualizar guía</button>
                          </form>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                {isPaid ? (
                  <details className="mt-3 rounded-lg border border-line" open={isToShip(o.fulfillment) && !isVerified(o.verifChecks)}>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Verificación del par</span>
                      {isVerified(o.verifChecks) ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Verificado · {o.verifChecks.length}/{VERIF_CHECKS.length} puntos</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{o.verifChecks.length > 0 ? `${o.verifChecks.length}/${VERIF_CHECKS.length} puntos, falta lo obligatorio` : "Sin verificar"}</span>
                      )}
                      {o.verifBy && o.verifAt ? <span className="text-xs text-muted">{o.verifBy} · {ago(o.verifAt)}</span> : null}
                      {(photos.get(o.id) ?? []).length > 0 ? <span className="text-xs text-muted">{(photos.get(o.id) ?? []).length} foto{(photos.get(o.id) ?? []).length === 1 ? "" : "s"}</span> : null}
                    </summary>
                    <div className="space-y-3 border-t border-line p-3">
                      {(photos.get(o.id) ?? []).length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                          {(photos.get(o.id) ?? []).map((pid) => (
                            <li key={pid} className="relative">
                              <a href={`/admin/pedidos/foto/${pid}`} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/admin/pedidos/foto/${pid}`} alt="Foto de recepción" loading="lazy" className="h-20 w-20 rounded-lg border border-line object-cover" />
                              </a>
                              <form action={removePhoto} className="absolute -right-1.5 -top-1.5">
                                <input type="hidden" name="photo" value={pid} />
                                <input type="hidden" name="ref" value={o.reference} />
                                <button type="submit" aria-label="Borrar foto" className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white hover:bg-accent">×</button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <form action={verifyOrder} className="space-y-3">
                        <input type="hidden" name="id" value={o.id} />
                        <fieldset className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                          <legend className="sr-only">Puntos de la verificación</legend>
                          {VERIF_CHECKS.map((c) => (
                            <label key={c.key} className="flex items-start gap-2 text-sm">
                              <input type="checkbox" name="check" value={c.key} defaultChecked={o.verifChecks.includes(c.key)} className="mt-0.5 h-4 w-4 flex-none accent-accent" />
                              <span>
                                <span className="font-semibold">{c.label}</span>
                                {REQUIRED_CHECKS.includes(c.key) ? <span className="text-accent"> *</span> : null}
                                <span className="block text-xs text-muted">{c.hint}</span>
                              </span>
                            </label>
                          ))}
                        </fieldset>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Nota de la verificación
                            <input name="note" defaultValue={o.verifNote} maxLength={300} autoComplete="off" placeholder="Solo la ves tú. Ej: cordones cambiados" className={`${inputCls} mt-1 normal-case tracking-normal`} />
                          </label>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Fotos de recepción
                            <div className="mt-1 normal-case tracking-normal"><PhotoPicker room={MAX_PHOTOS - (photos.get(o.id) ?? []).length} /></div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button type="submit" className={btnPrimary}>Guardar verificación</button>
                          <label className="flex items-center gap-2 text-xs text-muted">
                            <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-accent" />
                            Avisar al cliente por correo que su par fue verificado
                          </label>
                          <p className="text-xs text-muted"><span className="text-accent">*</span> obligatorios para darlo por verificado. Las fotos son evidencia interna: el cliente no las ve.</p>
                        </div>
                      </form>
                    </div>
                  </details>
                ) : null}

                {isPaid && o.sellerId ? (() => {
                  const info = payInfos.get(o.sellerId);
                  return (
                    <div className="mt-3 rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pago al revendedor</span>
                        <strong>{names.get(o.sellerId) ?? `Revendedor #${o.sellerId}`}</strong>
                        <span>recibe <strong>{formatPrice(o.payoutAmount)}</strong></span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYOUT_CLS[o.payoutStatus]}`}>{PAYOUT_LABEL[o.payoutStatus]}{o.payoutPaidAt ? ` · ${ago(o.payoutPaidAt)}` : o.payoutStartedAt ? ` · desde ${ago(o.payoutStartedAt)}` : ""}</span>
                      </div>
                      {info ? (
                        <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-sm">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Consignar a </span>
                          <strong className="select-all">{payoutDestination(info, true)}</strong>
                          <span className="select-all"> · {info.holder} · CC/NIT {info.document}</span>
                        </p>
                      ) : (
                        <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">Este revendedor todavía no dejó sus datos de pago. Pídeselos: los agrega en Cuenta → Datos de pago.</p>
                      )}
                      <form action={savePayoutStatus} className="mt-2 flex flex-wrap items-end gap-3">
                        <input type="hidden" name="id" value={o.id} />
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Estado del pago
                          <select name="payout" defaultValue={o.payoutStatus} className={`${selectAutoCls} mt-1 block normal-case tracking-normal`}>
                            {PAYOUT_STATUSES.map((st) => (
                              <option key={st} value={st}>{PAYOUT_LABEL[st]}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2 pb-2.5 text-xs text-muted">
                          <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-accent" />
                          Avisar al revendedor
                        </label>
                        <button type="submit" className={btnPrimary}>Guardar pago</button>
                        <p className="basis-full text-xs text-muted">Pasa a “en proceso” al empezar la consignación y a “pagado” cuando ya la hiciste. El revendedor ve cada cambio en su panel; el pago tarda {PAYOUT_WINDOW}.</p>
                      </form>
                    </div>
                  );
                })() : null}

                {isPaid ? (
                  <form action={saveFulfillment} className="mt-3 grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_1.4fr_auto] lg:items-end">
                    <input type="hidden" name="id" value={o.id} />
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Paso del envío
                      <select name="step" defaultValue={isToShip(o.fulfillment) && o.tracking ? "despachado" : o.fulfillment || "por_preparar"} className={`${selectAutoCls} mt-1 block w-full normal-case tracking-normal`}>
                        {FULFILLMENT_STEPS.map((s) => (
                          <option key={s} value={s}>{FULFILLMENT_LABEL[s]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Transportadora
                      <select name="carrier" defaultValue={o.carrier} className={`${selectAutoCls} mt-1 block w-full normal-case tracking-normal`}>
                        <option value="">—</option>
                        {CARRIERS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Número de guía
                      <input name="tracking" defaultValue={o.tracking} maxLength={60} autoComplete="off" placeholder="Ej: 2203456789" className={`${inputCls} mt-1 normal-case tracking-normal`} />
                    </label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Nota interna
                      <input name="note" defaultValue={o.shipNote} maxLength={300} autoComplete="off" placeholder="Solo la ves tú" className={`${inputCls} mt-1 normal-case tracking-normal`} />
                    </label>
                    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
                      <label className="flex items-center gap-2 text-xs text-muted">
                        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-accent" />
                        Avisar al cliente por correo
                      </label>
                      <button type="submit" className={btnPrimary}>Guardar</button>
                    </div>
                    <p className="text-xs text-muted sm:col-span-2 lg:col-span-5">
                      {o.paymentMethod.startsWith("WhatsApp") ? <><strong>Venta por WhatsApp:</strong> elige tú la transportadora y escribe la guía a mano; el cliente la recibe en el correo de despachado. </> : null}
                      El correo sale al pasar a <strong>En camino a verificación</strong>, <strong>Verificando y empacando</strong> (par recibido), <strong>Despachado</strong> (con la guía) o <strong>Entregado</strong> (pide la reseña). El aviso de <strong>verificado</strong> sale al guardar la verificación completa. Cliente:{" "}
                      <Link href={`/pedido/${o.reference}`} target="_blank" className="underline">ver lo que ve él</Link>
                      {o.shippedAt ? <span> · salió {ago(o.shippedAt)}</span> : null}
                    </p>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
