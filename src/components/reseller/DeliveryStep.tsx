"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { confirmItemDelivery } from "@/app/revendedores/delivery-actions";
import PayoutForm from "@/components/reseller/PayoutForm";
import { btnPrimary, inputCls, labelCls } from "@/components/reseller/ui";
import { PAYOUT_WINDOW, payoutDestination, type PayoutInfo } from "@/lib/payout-shared";
import type { Item } from "@/lib/reseller-shared";

const MAX_SIDE = 1100;

/** Reduce la foto en el navegador: así sube rápido aunque la foto del celular pese 8 MB. */
async function shrink(file: File): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    return await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.8));
  } catch {
    return null;
  }
}

const when = (ms: number) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(ms));

/** Una fila del recorrido: marcada si ya pasó, resaltada si es la que toca ahora. */
function Step({ n, done, current, children }: { n: number; done?: boolean; current?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
          done ? "bg-emerald-600 text-white" : current ? "bg-accent text-white" : "bg-ink/10 text-muted"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <div className={`min-w-0 flex-1 text-sm ${done || current ? "" : "text-muted"}`}>{children}</div>
    </li>
  );
}

function DeliveryForm({ item }: { item: Item }) {
  const [state, action, pending] = useActionState(confirmItemDelivery, undefined);
  const [mode, setMode] = useState<"dropoff" | "envio">("dropoff");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("proof");
    setLocalError("");
    if (!(file instanceof File) || file.size === 0) {
      setLocalError(mode === "envio" ? "Sube una foto de la guía o del recibo del envío." : "Sube una foto del par ya entregado en el punto.");
      return;
    }
    setBusy(true);
    const small = await shrink(file);
    setBusy(false);
    if (!small) {
      setLocalError("No pudimos leer esa foto. Prueba con otra en JPG o PNG.");
      return;
    }
    fd.set("proof", small, "prueba.jpg");
    startTransition(() => action(fd));
  }

  const error = localError || state?.error;
  const label = (id: "dropoff" | "envio", text: string) => (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${mode === id ? "border-ink bg-ink/5 font-semibold" : "border-line"}`}
    >
      <input type="radio" name="delivery" value={id} checked={mode === id} onChange={() => setMode(id)} className="accent-[var(--color-accent)]" />
      {text}
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-xl border border-line bg-paper-raised p-4">
      <input type="hidden" name="itemId" value={item.id} />
      <p className="font-semibold">Cuando ya lo tengas entregado, avísanos aquí</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {label("dropoff", "Lo dejé en el punto de verificación")}
        {label("envio", "Lo envié por transportadora")}
      </div>
      {mode === "envio" && (
        <div>
          <label className={labelCls} htmlFor={`tr-${item.id}`}>Número de guía (opcional)</label>
          <input id={`tr-${item.id}`} name="tracking" maxLength={40} autoComplete="off" placeholder="Ej: 240012345678" className={inputCls} />
        </div>
      )}
      <div>
        <label className={labelCls} htmlFor={`pf-${item.id}`}>
          {mode === "envio" ? "Foto de la guía o del recibo del envío" : "Foto del par ya entregado en el punto"}
        </label>
        <input
          id={`pf-${item.id}`}
          name="proof"
          type="file"
          accept="image/*"
          required
          className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white"
        />
        <p className="mt-1 text-xs text-muted">Es tu prueba de que ya lo dejaste: si hay un reclamo, el equipo la usa para encontrarlo.</p>
      </div>
      {error ? <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p> : null}
      <button type="submit" disabled={pending || busy} className={btnPrimary}>
        {busy ? "Preparando foto…" : pending ? "Enviando…" : "Ya lo entregué: avisar al equipo"}
      </button>
    </form>
  );
}

/**
 * Lo que sigue después de "Compra confirmada" en el inventario: 1) dejar o enviar el par y avisar con foto, 2) dar los datos de pago,
 * 3) verificación y pago. Así el revendedor siempre ve en qué paso va y qué le toca.
 */
export default function DeliveryStep({ item, payout }: { item: Item; payout: PayoutInfo | null }) {
  const dropped = item.purchaseDroppedAt !== null;
  return (
    <div className="mt-4 border-t border-emerald-600/20 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Así recibes tu plata</p>
      <ol className="mt-3 space-y-4">
        <Step n={1} done>
          Compra confirmada
        </Step>

        <Step n={2} done={dropped} current={!dropped}>
          <p className="font-semibold">{dropped ? "Entregaste el par" : "Deja el par en el punto (o envíalo) y avísanos"}</p>
          {dropped && item.purchaseDroppedAt !== null ? (
            <p className="mt-0.5 text-muted">
              {item.purchaseDelivery === "envio" ? "Lo enviaste" : "Lo dejaste en el punto"} · {when(item.purchaseDroppedAt)}
              {item.purchaseTracking ? ` · guía ${item.purchaseTracking}` : ""} ·{" "}
              <a href={`/api/revendedores/prueba/${item.id}`} target="_blank" rel="noreferrer" className="font-semibold underline">Ver tu foto</a>
            </p>
          ) : (
            <DeliveryForm item={item} />
          )}
        </Step>

        <Step n={3} done={dropped && Boolean(payout)} current={dropped && !payout}>
          <p className="font-semibold">Dinos a dónde te consignamos</p>
          {dropped ? (
            payout ? (
              <p className="mt-0.5 text-muted">
                Te pagamos a <strong className="text-ink">{payoutDestination(payout)}</strong> · {payout.holder} ·{" "}
                <Link href="/revendedores/cuenta#pago" className="font-semibold underline">Cambiar</Link>
              </p>
            ) : (
              <div className="mt-3">
                <PayoutForm initial={null} formId={`pago-${item.id}`} />
              </div>
            )
          ) : (
            <p className="mt-0.5">Te lo pedimos apenas avises que entregaste el par.</p>
          )}
        </Step>

        <Step n={4}>
          <p className="font-semibold">Verificamos tu par y te pagamos</p>
          <p className="mt-0.5">Cuando lo recibimos y pasa la verificación, te consignamos en {PAYOUT_WINDOW}. Te avisamos por aquí y por correo.</p>
        </Step>
      </ol>
    </div>
  );
}
