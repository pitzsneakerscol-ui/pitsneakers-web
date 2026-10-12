"use client";

import { useActionState, useState } from "react";
import { createReseller } from "@/app/admin/actions";
import { btnGhost, btnPrimary, cardCls, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

/** Formulario del dueño para crearle la cuenta a un vendedor (con su WhatsApp) y entregarle usuario y contraseña. */
export default function NewResellerForm() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(createReseller, undefined);

  return (
    <section className={`${cardCls} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Crear cuenta de vendedor</h2>
          <p className="mt-1 text-sm text-muted">Le armas el perfil con su WhatsApp y le das usuario y contraseña. Después le cargas su stock.</p>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className={btnGhost} aria-expanded={open}>
          {open ? "Cerrar" : "+ Nuevo vendedor"}
        </button>
      </div>

      {open && (
        <form key={formKey} onSubmit={submitWith(action)} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nv-username" className={labelCls}>Usuario *</label>
            <input id="nv-username" name="username" required autoComplete="off" placeholder="sebastian.zon" className={inputCls} />
          </div>
          <div>
            <label htmlFor="nv-name" className={labelCls}>Nombre o tienda</label>
            <input id="nv-name" name="displayName" autoComplete="off" placeholder="Sebastián Zon" className={inputCls} />
          </div>
          <div>
            <label htmlFor="nv-wa" className={labelCls}>WhatsApp * (con indicativo)</label>
            <input id="nv-wa" name="whatsapp" required inputMode="numeric" autoComplete="off" placeholder="573001234567" className={inputCls} />
          </div>
          <div>
            <label htmlFor="nv-email" className={labelCls}>Correo (le enviamos su acceso)</label>
            <input id="nv-email" name="email" type="email" autoComplete="off" placeholder="vendedor@correo.com" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nv-pass" className={labelCls}>Contraseña (la eliges tú)</label>
            <input id="nv-pass" name="password" type="text" autoComplete="off" minLength={8} maxLength={100} placeholder="Mínimo 8 caracteres — déjala vacía y se genera una" className={inputCls} />
            <p className="mt-1.5 text-xs text-muted">Se la entregas al vendedor junto con su usuario. Él puede cambiarla en su cuenta.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Creando…" : "Crear cuenta"}</button>
            {state?.ok && state.wa && (
              <a href={state.wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark">
                Enviar acceso por WhatsApp
              </a>
            )}
            {state?.ok && (
              <button type="button" onClick={() => setFormKey((k) => k + 1)} className={btnGhost}>Crear otra</button>
            )}
          </div>
          {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent sm:col-span-2">{state.error}</p>}
          {state?.ok && state.message && (
            <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:col-span-2">{state.message}</p>
          )}
        </form>
      )}
    </section>
  );
}
