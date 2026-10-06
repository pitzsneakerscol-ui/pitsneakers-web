"use client";

import { useActionState } from "react";
import { importCsv } from "@/app/revendedores/actions";
import { btnGhost, cardCls, inputCls, submitWith } from "@/components/reseller/ui";

export default function ImportForm() {
  const [state, action, pending] = useActionState(importCsv, undefined);
  return (
    <section className={`${cardCls} p-5 sm:p-6`}>
      <h2 className="font-display text-2xl tracking-wide">Importar o exportar</h2>
      <p className="mt-1 text-sm text-muted">
        ¿Ya llevas tu inventario en Excel o Google Sheets? Descárgalo como CSV y súbelo aquí.
        También puedes exportar todo para tener tu respaldo.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/revendedores/plantilla" className={btnGhost}>Descargar plantilla</a>
        <a href="/revendedores/exportar" className={btnGhost}>Exportar mi inventario (CSV)</a>
      </div>
      <form onSubmit={submitWith(action)} className="mt-5 flex flex-wrap items-center gap-3">
        <input type="file" name="file" accept=".csv,text/csv" required className={`${inputCls} max-w-sm`} aria-label="Archivo CSV" />
        <button type="submit" disabled={pending} className={btnGhost}>
          {pending ? "Importando…" : "Importar CSV"}
        </button>
      </form>
      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>
      )}
      {state?.ok && state.message && (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>
      )}
    </section>
  );
}
