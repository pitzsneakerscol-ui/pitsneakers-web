"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPair, changePassword, resendVerification, saveProfile } from "@/app/cuenta/actions";
import { payOffer } from "@/app/cuenta/offer-actions";
import { btnAccent, btnGhost, inputCls, labelCls, submitWith } from "@/components/reseller/ui";
import ShippingFields from "@/components/ShippingFields";

const msg = (s: { error?: string; message?: string } | undefined) =>
  s?.error ? (
    <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{s.error}</p>
  ) : s?.message ? (
    <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{s.message}</p>
  ) : null;

export function ProfileForm({ name, phone, city }: { name: string; phone: string; city: string }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <div>
        <label htmlFor="p-name" className={labelCls}>Nombre</label>
        <input id="p-name" name="name" defaultValue={name} required maxLength={80} autoComplete="name" className={inputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-phone" className={labelCls}>Celular</label>
          <input id="p-phone" name="phone" defaultValue={phone} inputMode="numeric" maxLength={14} placeholder="3001234567" autoComplete="tel-national" className={inputCls} />
        </div>
        <div>
          <label htmlFor="p-city" className={labelCls}>Ciudad</label>
          <input id="p-city" name="city" defaultValue={city} maxLength={60} autoComplete="address-level2" className={inputCls} />
        </div>
      </div>
      {msg(state)}
      <button type="submit" disabled={pending} className={btnAccent}>{pending ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      {hasPassword && (
        <div>
          <label htmlFor="pw-cur" className={labelCls}>Contraseña actual</label>
          <input id="pw-cur" name="current" type="password" autoComplete="current-password" required className={inputCls} />
        </div>
      )}
      <div>
        <label htmlFor="pw-new" className={labelCls}>{hasPassword ? "Contraseña nueva" : "Crea una contraseña (así también puedes entrar sin Google)"}</label>
        <input id="pw-new" name="password" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
      </div>
      {msg(state)}
      <button type="submit" disabled={pending} className={btnGhost}>{pending ? "Guardando…" : hasPassword ? "Cambiar contraseña" : "Crear contraseña"}</button>
    </form>
  );
}

export function ResendVerification() {
  const [state, action, pending] = useActionState(async () => resendVerification(), undefined);
  return (
    <div className="space-y-2">
      <form action={action}>
        <button type="submit" disabled={pending} className={btnGhost}>{pending ? "Enviando…" : "Reenviar correo de confirmación"}</button>
      </form>
      {msg(state)}
    </div>
  );
}

/** Agregar a mano un par que compraste en otro lado. */
export function AddPairForm() {
  const [state, action, pending] = useActionState(addPair, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Al agregar con éxito se limpian los campos para poder cargar otro par.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} onSubmit={submitWith(action)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="a-name" className={labelCls}>Par</label>
          <input id="a-name" name="name" required maxLength={100} placeholder="Jordan 1 High Chicago" className={inputCls} />
        </div>
        <div>
          <label htmlFor="a-size" className={labelCls}>Talla</label>
          <input id="a-size" name="size" maxLength={12} placeholder="9.5" className={inputCls} />
        </div>
        <div>
          <label htmlFor="a-paid" className={labelCls}>Lo que pagaste (COP)</label>
          <input id="a-paid" name="paid" inputMode="numeric" required placeholder="900000" className={inputCls} />
        </div>
      </div>
      {msg(state)}
      <button type="submit" disabled={pending} className={btnAccent}>{pending ? "Agregando…" : "Agregar a mi colección"}</button>
    </form>
  );
}

/** Pago de una oferta aceptada: confirma celular y ciudad y manda a Wompi. */
export function PayOfferForm({ id, name, phone, city, label }: { id: number; name: string; phone: string; city: string; label: string }) {
  const [state, action, pending] = useActionState(payOffer, undefined);
  return (
    <form onSubmit={submitWith(action)} className="mt-3 space-y-3 rounded-xl border border-ink/15 bg-paper p-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label htmlFor={`po-n-${id}`} className={labelCls}>Nombre y apellido</label>
          <input id={`po-n-${id}`} name="name" defaultValue={name} required maxLength={80} className={inputCls} />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor={`po-p-${id}`} className={labelCls}>Celular</label>
          <input id={`po-p-${id}`} name="phone" defaultValue={phone} inputMode="numeric" required maxLength={14} placeholder="3001234567" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <p className="pt-6 text-[11px] text-muted">Te llevamos a pagar con estos datos y la dirección de abajo.</p>
        </div>
      </div>
      <ShippingFields idPrefix={`po-${id}`} defaults={{ city }} />
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnAccent} w-full`}>{pending ? "Llevándote a Wompi…" : label}</button>
    </form>
  );
}
