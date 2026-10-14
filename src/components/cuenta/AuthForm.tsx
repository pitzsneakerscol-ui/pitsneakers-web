"use client";

import { useActionState, useState } from "react";
import { login, register } from "@/app/cuenta/actions";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4Z" />
    <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3Z" />
    <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A12 12 0 0 0 1.8 7.1l3.8 3C6.5 6.8 9 4.8 12 4.8Z" />
  </svg>
);

/** Entrar o crear cuenta de comprador: Google o correo + contraseña. */
export default function AuthForm({ next, googleEnabled, startOnLogin = true }: { next: string; googleEnabled: boolean; startOnLogin?: boolean }) {
  const [tab, setTab] = useState<"login" | "register">(startOnLogin ? "login" : "register");
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);
  const [regState, regAction, regPending] = useActionState(register, undefined);

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm sm:p-8">
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-full bg-paper p-1 text-xs font-semibold uppercase tracking-wide">
        {(
          [
            ["login", "Ingresar"],
            ["register", "Crear cuenta"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2.5 transition ${tab === key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {googleEnabled && (
        <>
          <a href={`/api/cuenta/google?next=${encodeURIComponent(next)}`} className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-neutral-800 transition hover:border-ink">
            <GoogleLogo /> Continuar con Google
          </a>
          <p className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted">
            <span className="h-px flex-1 bg-line" /> o con tu correo <span className="h-px flex-1 bg-line" />
          </p>
        </>
      )}

      {tab === "login" ? (
        <form onSubmit={submitWith(loginAction)} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="c-email" className={labelCls}>Correo</label>
            <input id="c-email" name="email" type="email" autoComplete="email" required maxLength={120} placeholder="tu@correo.com" className={inputCls} />
          </div>
          <div>
            <label htmlFor="c-pass" className={labelCls}>Contraseña</label>
            <input id="c-pass" name="password" type="password" autoComplete="current-password" required className={inputCls} />
            <p className="mt-2 text-right text-xs">
              <a href="/cuenta/recuperar" className="font-semibold text-muted underline underline-offset-4 hover:text-accent">¿Olvidaste tu contraseña?</a>
            </p>
          </div>
          {loginState?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{loginState.error}</p>}
          <button type="submit" disabled={loginPending} className={`${btnAccent} w-full`}>{loginPending ? "Ingresando…" : "Ingresar"}</button>
        </form>
      ) : (
        <form onSubmit={submitWith(regAction)} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="n-name" className={labelCls}>Nombre</label>
            <input id="n-name" name="name" autoComplete="name" required maxLength={80} className={inputCls} />
          </div>
          <div>
            <label htmlFor="n-email" className={labelCls}>Correo</label>
            <input id="n-email" name="email" type="email" autoComplete="email" required maxLength={120} placeholder="tu@correo.com" className={inputCls} />
            <p className="mt-1.5 text-xs text-muted">Usa el mismo correo con el que has comprado: así aparecen tus pares en tu colección.</p>
          </div>
          <div>
            <label htmlFor="n-pass" className={labelCls}>Contraseña</label>
            <input id="n-pass" name="password" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
            <p className="mt-1.5 text-xs text-muted">Mínimo 8 caracteres.</p>
          </div>
          {/* Campo trampa para bots: las personas no lo ven. */}
          <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
          {regState?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{regState.error}</p>}
          <button type="submit" disabled={regPending} className={`${btnAccent} w-full`}>{regPending ? "Creando…" : "Crear mi cuenta"}</button>
          <p className="text-center text-[11px] text-muted">Al crear tu cuenta aceptas nuestras <a href="/politicas" className="underline">políticas</a>.</p>
        </form>
      )}
    </div>
  );
}
