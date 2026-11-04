"use client";

import { useActionState } from "react";
import { importContactsAction } from "@/app/admin/contactos/actions";
import { btnAccent, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

export default function ContactImportForm() {
  const [state, action, pending] = useActionState(importContactsAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="ci-file">Archivo CSV</label>
          <input id="ci-file" name="file" type="file" accept=".csv,text/csv" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="ci-source">De dónde vienen</label>
          <input id="ci-source" name="source" maxLength={60} placeholder="Formulario comunidad 2024" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="ci-text">…o pega el contenido del CSV</label>
        <textarea id="ci-text" name="text" rows={4} placeholder={"email,nombre,telefono,ciudad,notas\nana@gmail.com,Ana Pérez,3001234567,Medellín,"} className={`${inputCls} font-mono text-xs`} />
      </div>
      <p className="text-xs text-muted">
        La primera línea es el encabezado. Se reconocen las columnas email/correo, nombre, telefono/celular, ciudad, notas y unsubscribed/baja. Si un correo ya existe solo se completan los datos que le faltaban, y a quien ya se dio de baja no se le quita la baja.
      </p>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      {state?.ok && state.message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>}
      <button type="submit" disabled={pending} className={btnAccent}>
        {pending ? "Importando…" : "Importar contactos"}
      </button>
    </form>
  );
}
