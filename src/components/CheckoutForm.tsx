"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { startCheckout } from "@/app/comprar/actions";
import { formatPrice } from "@/lib/format";
import { processingFee } from "@/lib/fees";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

/** "Comprar ahora": pide los datos y manda a pagar en Wompi (PSE, Nequi, tarjeta). El envío se coordina por WhatsApp después del pago. */
export default function CheckoutForm({ productId, size, name, price, test }: { productId: string; size: string; name: string; price: number; test: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(startCheckout, undefined);
  const fee = processingFee(price);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btnAccent} w-full !py-4 !text-sm`}>
        Comprar ahora · {formatPrice(price)}
      </button>
    );
  }

  return (
    <form onSubmit={submitWith(action)} className="space-y-3 rounded-2xl border border-ink/20 bg-paper-raised p-4 sm:p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="size" value={size} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted">{size && size !== "Única" ? `Talla ${size} · ` : ""}{formatPrice(price)}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink">Cerrar</button>
      </div>
      {test && <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">Modo de pruebas: no se cobra dinero real.</p>}
      <div>
        <label htmlFor="co-name" className={labelCls}>Nombre y apellido</label>
        <input id="co-name" name="name" required autoComplete="name" maxLength={80} className={inputCls} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="co-email" className={labelCls}>Correo</label>
          <input id="co-email" name="email" type="email" required autoComplete="email" maxLength={120} className={inputCls} />
        </div>
        <div>
          <label htmlFor="co-phone" className={labelCls}>Celular</label>
          <input id="co-phone" name="phone" type="tel" inputMode="numeric" required autoComplete="tel-national" placeholder="3001234567" maxLength={14} className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="co-city" className={labelCls}>Ciudad de entrega</label>
        <input id="co-city" name="city" required autoComplete="address-level2" maxLength={60} className={inputCls} />
      </div>
      <div>
        <label htmlFor="co-credit" className={labelCls}>Código de crédito (opcional)</label>
        <input id="co-credit" name="credit" autoComplete="off" autoCapitalize="characters" maxLength={20} placeholder="CRED-XXXXXXX" className={`${inputCls} font-mono tracking-wider`} />
        <p className="mt-1 text-[11px] text-muted">Si ganaste en la trivia, escribe tu código con el mismo correo con el que juegas.</p>
      </div>
      {/* Campo trampa para bots: las personas no lo ven. */}
      <div className="hidden" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {/* Resumen del cobro: el par, el costo de procesar el pago en línea y el total. */}
      <dl className="space-y-1 rounded-xl bg-paper px-4 py-3 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Par</dt><dd className="tabular-nums">{formatPrice(price)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Costo del pago en línea</dt><dd className="tabular-nums">{formatPrice(fee)}</dd></div>
        <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Total a pagar</dt><dd className="tabular-nums">{formatPrice(price + fee)}</dd></div>
      </dl>
      <p className="text-[11px] text-muted">Es lo que cobra la pasarela por procesar PSE, Nequi o tarjeta. Si prefieres no pagarlo, escríbenos por WhatsApp y acordamos otro medio de pago. Si usas un código de crédito, el costo se recalcula sobre el valor ya descontado.</p>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnAccent} w-full !py-3.5 !text-sm`}>
        {pending ? "Llevándote a Wompi…" : `Pagar ${formatPrice(price + fee)} con Wompi`}
      </button>
      <p className="text-center text-[11px] text-muted">
        PSE, Nequi o tarjeta. Pago seguro en Wompi (Bancolombia). El envío lo coordinamos por WhatsApp después de pagar. Al pagar aceptas nuestras{" "}
        <Link href="/politicas" className="underline underline-offset-2 hover:text-ink">políticas de compra y datos</Link>; tienes 5 días hábiles de retracto.
      </p>
    </form>
  );
}
