"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/admin/actions";
import { btnGhost, inputCls, submitWith } from "@/components/reseller/ui";

export default function ResetPassword({ id, username }: { id: number; username: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form
      onSubmit={(e) => {
        if (!window.confirm(`¿Restablecer la contraseña de @${username}? Se cerrará su sesión.`)) {
          e.preventDefault();
          return;
        }
        submitWith(action)(e);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <input name="password" type="text" autoComplete="off" minLength={8} maxLength={100} placeholder="Contraseña nueva (opcional: vacía = se genera)" aria-label="Contraseña nueva" className={inputCls} />
      <button type="submit" disabled={pending} className={btnGhost}>
        {pending ? "Generando…" : "Restablecer contraseña"}
      </button>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      {state?.ok && state.wa && (
        <a href={state.wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark">
          Enviar acceso por WhatsApp
        </a>
      )}
      {state?.ok && state.message && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>
      )}
    </form>
  );
}
