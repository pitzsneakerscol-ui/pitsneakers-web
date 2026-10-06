"use client";

import { useActionState, useState } from "react";
import { login, register } from "@/app/revendedores/actions";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

export default function AuthForms() {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [loginState, loginAction, loginPending] = useActionState(login, undefined);
  const [regState, regAction, regPending] = useActionState(register, undefined);

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm sm:p-8">
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-full bg-paper p-1 text-xs font-semibold uppercase tracking-wide">
        {(
          [
            ["register", "Crear cuenta"],
            ["login", "Ingresar"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2.5 transition ${tab === key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <form onSubmit={submitWith(loginAction)} className="space-y-4">
          <div>
            <label htmlFor="l-user" className={labelCls}>Usuario</label>
            <input id="l-user" name="username" autoComplete="username" required maxLength={24} className={inputCls} />
          </div>
          <div>
            <label htmlFor="l-pass" className={labelCls}>Contraseña</label>
            <input id="l-pass" name="password" type="password" autoComplete="current-password" required className={inputCls} />
          </div>
          {loginState?.error && (
            <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{loginState.error}</p>
          )}
          <button type="submit" disabled={loginPending} className={`${btnAccent} w-full`}>
            {loginPending ? "Ingresando…" : "Ingresar a mi panel"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitWith(regAction)} className="space-y-4">
          <div>
            <label htmlFor="r-user" className={labelCls}>Usuario *</label>
            <input id="r-user" name="username" autoComplete="username" required minLength={3} maxLength={24} placeholder="tu.usuario" className={inputCls} />
            <p className="mt-1.5 text-xs text-muted">Letras, números, punto, guion o guion bajo.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="r-name" className={labelCls}>Nombre o tienda</label>
              <input id="r-name" name="displayName" maxLength={40} autoComplete="name" className={inputCls} />
            </div>
            <div>
              <label htmlFor="r-wa" className={labelCls}>WhatsApp (opcional)</label>
              <input id="r-wa" name="whatsapp" inputMode="tel" maxLength={20} placeholder="573001234567" className={inputCls} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="r-pass" className={labelCls}>Contraseña *</label>
              <input id="r-pass" name="password" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
            </div>
            <div>
              <label htmlFor="r-conf" className={labelCls}>Repetir contraseña *</label>
              <input id="r-conf" name="confirm" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-muted">Mínimo 8 caracteres. Guárdala bien: por ahora no hay recuperación por correo.</p>
          {/* Campo trampa para bots: las personas no lo ven. */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="r-web">Sitio web</label>
            <input id="r-web" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          {regState?.error && (
            <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{regState.error}</p>
          )}
          <button type="submit" disabled={regPending} className={`${btnAccent} w-full`}>
            {regPending ? "Creando cuenta…" : "Crear mi cuenta gratis"}
          </button>
        </form>
      )}
    </div>
  );
}
