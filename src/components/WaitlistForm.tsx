"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { joinList } from "@/app/proximamente/actions";
import { submitWith } from "@/components/reseller/ui";

/** Formulario de la lista de espera: correo → pase personal para la subasta. */
export default function WaitlistForm() {
  const [state, action, pending] = useActionState(joinList, undefined);
  const [copied, setCopied] = useState(false);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin portapapeles: el código queda visible para copiarlo a mano */
    }
  }

  if (state?.ok) {
    return (
      <div className="pl-done rounded-2xl border border-accent/50 bg-white/5 p-6 text-center backdrop-blur">
        <p className="text-4xl" aria-hidden="true">🔨</p>
        <h2 className="mt-2 font-display text-3xl tracking-wide">¡Ya estás en la lista!</h2>
        {state.code && (
          <button
            type="button"
            onClick={() => copy(state.code!)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-accent bg-accent/10 px-5 py-3 font-display text-2xl tracking-[0.2em] text-accent transition hover:bg-accent/20"
            aria-label={`Copiar el código ${state.code}`}
          >
            {state.code}
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/70">{copied ? "Copiado" : "Copiar"}</span>
          </button>
        )}
        {state.code && <p className="mt-2 text-sm text-white/80">Es tu pase personal para la subasta exclusiva.</p>}
        <p className="mt-2 text-sm text-white/70">{state.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submitWith(action)} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="wl-email" className="sr-only">Tu correo</label>
        <input
          id="wl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={120}
          placeholder="tu@correo.com"
          className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3.5 text-base text-white outline-none backdrop-blur transition placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="pl-cta inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-7 py-3.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Inscribiendo…" : "Quiero entrar a la subasta"}
        </button>
      </div>
      {/* Campo trampa para bots: las personas no lo ven. */}
      <div className="hidden" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/15 px-4 py-3 text-sm text-white">{state.error}</p>}
      <p className="text-center text-xs text-white/50">
        Sin spam. Solo tu pase y los avisos de subasta y trivia. Al inscribirte aceptas el tratamiento de tus datos según nuestras{" "}
        <Link href="/politicas#datos" className="underline underline-offset-2 hover:text-white">políticas</Link>.
      </p>
    </form>
  );
}
