"use client";

import Link from "next/link";
import { useActionState, useEffect, useSyncExternalStore } from "react";
import { joinBlackFriday } from "@/app/sale/lead-actions";
import { BF_COOKIE } from "@/lib/sale-shared";
import { trackMeta } from "@/lib/meta-client";

const EVENT = "pit-bf-unlocked";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
const read = () => document.cookie.split("; ").some((c) => c === `${BF_COOKIE}=1`);

/** ¿Ya dejó su correo en este navegador? En el servidor siempre es false (así el HTML y la hidratación coinciden). */
export function useBfUnlocked(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Correo para entrar a Black Friday. Al guardarse, la cookie queda puesta y todo lo que escucha `useBfUnlocked` se abre. */
export function LeadForm({ id, compact = false, cta = "Entrar" }: { id: string; compact?: boolean; cta?: string }) {
  const [state, action, pending] = useActionState(joinBlackFriday, undefined);
  useEffect(() => {
    if (state?.ok) window.dispatchEvent(new Event(EVENT));
    // Píxel de Meta: dejó su correo (con el mismo id que mandó el servidor, para no contarlo dos veces).
    if (state?.ok && state.eid) trackMeta("Lead", { content_name: "Lista Black Friday" }, state.eid);
  }, [state]);

  return (
    <form action={action} className="w-full max-w-md" noValidate>
      <label htmlFor={`${id}-email`} className="sr-only">
        Tu correo
      </label>
      <div className={`flex gap-2 ${compact ? "flex-col sm:flex-row" : "flex-col"}`}>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          aria-describedby={`${id}-note`}
          aria-invalid={Boolean(state?.error)}
          className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3.5 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-white/30"
        />
        {/* Campo trampa para bots: las personas no lo ven. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-white px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#0d0d0e] transition hover:bg-white/90 disabled:opacity-60"
        >
          {pending ? "Un momento…" : cta}
        </button>
      </div>
      <p role="alert" className="mt-2 min-h-5 text-xs text-[#ff8a6b]">
        {state?.error ?? ""}
      </p>
      <p id={`${id}-note`} className="text-[11px] leading-relaxed text-white/60">
        Al continuar aceptas recibir correos de Pitsneakers con ofertas y novedades. Puedes darte de baja cuando quieras.{" "}
        <Link href="/politicas" className="underline underline-offset-2 hover:text-white">
          Política de datos
        </Link>
      </p>
    </form>
  );
}

/**
 * Candado de Black Friday: sin correo, las ofertas se ven borrosas detrás de un formulario; con correo, se abren.
 * El correo queda en los contactos de marketing (origen "black-friday") para campañas de email.
 */
export function BlackFridayGate({ children, name }: { children: React.ReactNode; name: string }) {
  const unlocked = useBfUnlocked();
  if (unlocked) return <>{children}</>;
  return (
    <div className="relative">
      <div inert aria-hidden="true" className="pointer-events-none max-h-[34rem] select-none overflow-hidden blur-md saturate-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center px-2 pt-10 sm:pt-16">
        <div
          role="region"
          aria-label={`Entrar a ${name}`}
          className="w-full max-w-lg rounded-3xl bg-[#0d0d0e] px-6 py-8 text-center text-white shadow-2xl ring-1 ring-white/10 sm:px-10 sm:py-10"
          style={{ backgroundImage: "radial-gradient(80% 100% at 50% 0%, rgba(200,64,40,0.4) 0%, transparent 70%)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff8a6b]">Acceso exclusivo</p>
          <h2 className="mt-3 font-display text-3xl uppercase tracking-wide sm:text-4xl">Entra a {name}</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-white/70">Deja tu correo y mira todos los pares con descuento. Te avisamos primero cuando haya más.</p>
          <div className="mt-6 flex justify-center">
            <LeadForm id="bf-gate" cta="Ver las ofertas" />
          </div>
        </div>
      </div>
    </div>
  );
}
