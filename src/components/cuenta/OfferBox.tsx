"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { makeOffer } from "@/app/cuenta/offer-actions";
import { formatPrice } from "@/lib/format";
import { minOffer } from "@/lib/buyer-shared";
import { btnAccent, btnGhost, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

type Me = { in: boolean; enabled: boolean; verified?: boolean; minOfferPct?: number; payHours?: number; league?: string } | null;

/** "Hacer una oferta" en la ficha del par: pide cuenta (y correo verificado) y manda el valor al dueño. */
export default function OfferBox({ productId, size, name, price, slug }: { productId: string; size: string; name: string; price: number; slug: string }) {
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(makeOffer, undefined);

  useEffect(() => {
    let live = true;
    fetch("/api/cuenta/estado", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Me) => {
        if (live) setMe(d);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (!me?.enabled || price <= 0) return null;
  const min = minOffer(price, me.minOfferPct);
  const payHours = me.payHours ?? 24;

  if (!me.in) {
    return (
      <Link href={`/cuenta/ingresar?next=${encodeURIComponent(`/producto/${slug}`)}`} className={`${btnGhost} mt-3 w-full !py-3.5 !text-sm`}>
        Inicia sesión para hacer una oferta
      </Link>
    );
  }

  if (state?.ok) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
        <p className="font-semibold">¡Oferta enviada!</p>
        <p className="mt-1">{state.message}</p>
        <Link href="/cuenta/ofertas" className="mt-2 inline-block font-semibold underline underline-offset-4">Ver mis ofertas</Link>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btnGhost} mt-3 w-full !py-3.5 !text-sm`}>
        Hacer una oferta
      </button>
    );
  }

  return (
    <form onSubmit={submitWith(action)} className="mt-3 space-y-3 rounded-2xl border border-ink/20 bg-paper-raised p-4 sm:p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="size" value={size} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted">{size && size !== "Única" ? `Talla ${size} · ` : ""}Precio {formatPrice(price)}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink">Cerrar</button>
      </div>
      {me.verified === false && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">Primero confirma tu correo (te enviamos un enlace). Puedes reenviarlo desde <Link href="/cuenta" className="font-semibold underline">Mi cuenta</Link>.</p>
      )}
      <div>
        <label htmlFor="of-amount" className={labelCls}>Tu oferta (COP)</label>
        <input id="of-amount" name="amount" inputMode="numeric" required placeholder={String(min)} className={inputCls} />
        <p className="mt-1.5 text-xs text-muted">Mínimo {formatPrice(min)}. Si la aceptamos, tienes {payHours} horas para pagarla desde tu cuenta{me.league && me.league !== "Bronce" ? ` (beneficio de tu liga ${me.league})` : ""}; si no, te respondemos con una contraoferta.</p>
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnAccent} w-full`}>
        {pending ? "Enviando…" : "Enviar oferta"}
      </button>
    </form>
  );
}
