"use client";

import { useActionState } from "react";
import { enterAuction } from "@/app/subasta/actions";
import { submitWith } from "@/components/reseller/ui";

const input =
  "w-full rounded-full border border-white/20 bg-white/10 px-5 py-3.5 text-base text-white outline-none backdrop-blur transition placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/30";

/** Entrada a la subasta: correo + pase personal de la lista de espera. */
export default function PassForm() {
  const [state, action, pending] = useActionState(enterAuction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-3 text-left">
      <label htmlFor="pass-email" className="sr-only">Correo con el que te inscribiste</label>
      <input id="pass-email" name="email" type="email" required autoComplete="email" maxLength={120} placeholder="Tu correo de inscripción" className={input} />
      <label htmlFor="pass-code" className="sr-only">Tu pase</label>
      <input id="pass-code" name="code" required autoComplete="off" autoCapitalize="characters" maxLength={20} placeholder="Tu pase (ej. PITS7KX2QM)" className={`${input} font-display tracking-[0.15em]`} />
      {state?.error && <p role="alert" className="rounded-lg bg-accent/15 px-4 py-3 text-sm text-white">{state.error}</p>}
      <button type="submit" disabled={pending} className="pl-cta w-full rounded-full bg-accent px-7 py-3.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60">
        {pending ? "Validando…" : "Entrar a la subasta"}
      </button>
    </form>
  );
}
