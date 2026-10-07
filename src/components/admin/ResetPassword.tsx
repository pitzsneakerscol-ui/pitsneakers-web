"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/admin/actions";
import { btnGhost, submitWith } from "@/components/reseller/ui";

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
      <button type="submit" disabled={pending} className={btnGhost}>
        {pending ? "Generando…" : "Restablecer contraseña"}
      </button>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      {state?.ok && state.message && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>
      )}
    </form>
  );
}
