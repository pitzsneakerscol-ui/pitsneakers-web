"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmReset, requestReset } from "@/app/cuenta/actions";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

const box = "rounded-2xl border border-line bg-paper-raised p-6 shadow-sm sm:p-8";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  if (state?.ok) {
    return (
      <div className={`${box} text-center`}>
        <p className="text-4xl" aria-hidden="true">📬</p>
        <h2 className="mt-2 font-display text-3xl tracking-wide">Revisa tu correo</h2>
        <p className="mt-2 text-sm text-muted">{state.message}</p>
        <Link href="/cuenta/ingresar" className="mt-5 inline-block text-sm font-semibold underline underline-offset-4 hover:text-accent">Volver a ingresar</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submitWith(action)} className={`${box} space-y-4`}>
      <div>
        <label htmlFor="f-email" className={labelCls}>Tu correo</label>
        <input id="f-email" name="email" type="email" required autoComplete="email" maxLength={120} placeholder="tu@correo.com" className={inputCls} />
      </div>
      <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnAccent} w-full`}>{pending ? "Enviando…" : "Enviarme el enlace"}</button>
      <p className="text-center text-xs text-muted">Te llega un correo con un enlace que vale 1 hora.</p>
    </form>
  );
}

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(confirmReset, undefined);
  return (
    <form onSubmit={submitWith(action)} className={`${box} space-y-4`}>
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted">Cuenta: <strong className="text-ink">{email}</strong></p>
      <div>
        <label htmlFor="r-pass" className={labelCls}>Contraseña nueva</label>
        <input id="r-pass" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        <p className="mt-1.5 text-xs text-muted">Mínimo 8 caracteres.</p>
      </div>
      <div>
        <label htmlFor="r-conf" className={labelCls}>Repite la contraseña</label>
        <input id="r-conf" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnAccent} w-full`}>{pending ? "Guardando…" : "Guardar y entrar"}</button>
    </form>
  );
}
