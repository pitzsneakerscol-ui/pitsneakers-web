"use client";

import { useActionState } from "react";
import { markItemPaid, markItemReceived } from "@/app/admin/actions";
import { submitWith } from "@/components/reseller/ui";

const day = (ms: number) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" }).format(new Date(ms));

const small =
  "inline-flex items-center rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition hover:border-ink disabled:opacity-50";

/**
 * Lo que sigue de una compra confirmada (venta por fuera de la plataforma): recibir el paquete (le llega al vendedor un enlace
 * para entrar y completar sus datos) y, cuando ya dio el destino del pago, registrar que se le consignó.
 */
export default function ItemDeliveryAdmin({
  itemId,
  receivedAt,
  paidAt,
  payoutText,
}: {
  itemId: number;
  receivedAt: number | null;
  paidAt: number | null;
  /** Destino del pago que dio el vendedor, con el número completo (solo lo ve el equipo). Vacío si aún no lo da. */
  payoutText: string;
}) {
  const [recv, recvAction, recvPending] = useActionState(markItemReceived, undefined);
  const [paid, paidAction, paidPending] = useActionState(markItemPaid, undefined);

  return (
    <div className="mt-2 space-y-2 text-xs">
      <form onSubmit={submitWith(recvAction)} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="itemId" value={itemId} />
        <button type="submit" disabled={recvPending} className={small}>
          {recvPending ? "Enviando…" : receivedAt ? "↻ Reenviar aviso" : "📦 Recibí el paquete"}
        </button>
        <label className="flex items-center gap-1.5 text-muted">
          <input type="checkbox" name="email" defaultChecked className="h-3.5 w-3.5 accent-emerald-700" />
          También por correo
        </label>
        {receivedAt ? <span className="font-semibold text-emerald-700">✓ Recibido el {day(receivedAt)}</span> : null}
      </form>
      {recv?.error && <p role="alert" className="text-accent">{recv.error}</p>}
      {recv?.ok && (
        <div role="status" className="space-y-1.5">
          <p className="break-all text-emerald-700">{recv.message}</p>
          {recv.wa && (
            <a href={recv.wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full bg-whatsapp px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-whatsapp-dark">
              Mandar por WhatsApp
            </a>
          )}
        </div>
      )}

      {paidAt ? (
        <p className="font-semibold text-emerald-700">💸 Consignado el {day(paidAt)}</p>
      ) : (
        <form onSubmit={submitWith(paidAction)} className="space-y-1">
          <input type="hidden" name="itemId" value={itemId} />
          <p className="text-muted">{payoutText ? <>Pagar a: <strong className="text-ink">{payoutText}</strong></> : "Aún no da sus datos de pago."}</p>
          <button type="submit" disabled={paidPending || !payoutText} className={small}>
            {paidPending ? "Guardando…" : "💸 Ya le consigné"}
          </button>
          {paid?.error && <p role="alert" className="text-accent">{paid.error}</p>}
          {paid?.ok && paid.message && <p role="status" className="text-emerald-700">{paid.message}</p>}
        </form>
      )}
    </div>
  );
}
