"use client";

import { useActionState, useState } from "react";
import { changePassword, deleteAccount, updateProfile } from "@/app/revendedores/actions";
import type { ActionState } from "@/lib/reseller-shared";
import { btnPrimary, cardCls, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

function Status({ state }: { state: { ok?: boolean; error?: string; message?: string } | undefined }) {
  if (state?.error)
    return <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>;
  if (state?.ok && state.message)
    return <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>;
  return null;
}

export function ProfileForm({
  username,
  displayName,
  whatsapp,
  email,
}: {
  username: string;
  displayName: string;
  whatsapp: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form onSubmit={submitWith(action)} className={`${cardCls} space-y-4 p-5 sm:p-6`}>
      <h2 className="font-display text-2xl tracking-wide">Perfil</h2>
      <div>
        <label className={labelCls} htmlFor="p-user">Usuario</label>
        <input id="p-user" value={username} disabled className={`${inputCls} opacity-60`} readOnly />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="p-name">Nombre o tienda</label>
          <input id="p-name" name="displayName" maxLength={40} defaultValue={displayName} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="p-wa">WhatsApp</label>
          <input id="p-wa" name="whatsapp" inputMode="tel" maxLength={20} defaultValue={whatsapp} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="p-email">Correo</label>
        <input id="p-email" name="email" type="email" maxLength={120} defaultValue={email} className={inputCls} />
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const res = await changePassword(prev, fd);
      if (res?.ok) setFormKey((k) => k + 1);
      return res;
    },
    undefined
  );
  return (
    <form key={formKey} onSubmit={submitWith(action)} className={`${cardCls} space-y-4 p-5 sm:p-6`}>
      <h2 className="font-display text-2xl tracking-wide">Cambiar contraseña</h2>
      <div>
        <label className={labelCls} htmlFor="pw-cur">Contraseña actual</label>
        <input id="pw-cur" name="current" type="password" autoComplete="current-password" required className={inputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="pw-new">Nueva contraseña</label>
          <input id="pw-new" name="next" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="pw-conf">Repetir nueva contraseña</label>
          <input id="pw-conf" name="confirm" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
        </div>
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

/** Eliminar la cuenta y todo lo que hay en ella: pide la contraseña y escribir ELIMINAR. */
export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  return (
    <form onSubmit={submitWith(action)} className={`${cardCls} space-y-4 p-5 sm:p-6`}>
      <h2 className="font-display text-2xl tracking-wide">Eliminar mi cuenta</h2>
      <p className="text-sm text-muted">
        Borramos tu cuenta y todo lo que hay en ella: inventario, avisos, preguntas, ofertas y accesos. No se puede deshacer. Descarga antes un respaldo desde Inventario si lo necesitas.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="del-pw">Tu contraseña</label>
          <input id="del-pw" name="password" type="password" autoComplete="current-password" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="del-confirm">Escribe ELIMINAR</label>
          <input id="del-confirm" name="confirm" autoComplete="off" required className={inputCls} />
        </div>
      </div>
      <Status state={state} />
      <button type="submit" disabled={pending} className="inline-flex items-center justify-center rounded-full border border-accent px-6 py-3 text-xs font-semibold uppercase tracking-wide text-accent transition hover:bg-accent hover:text-white disabled:opacity-50">
        {pending ? "Eliminando…" : "Eliminar mi cuenta"}
      </button>
    </form>
  );
}
