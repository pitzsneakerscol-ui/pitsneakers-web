"use client";

import { useActionState, useState } from "react";
import { addItems } from "@/app/revendedores/actions";
import type { ActionState } from "@/lib/reseller-shared";
import ItemFields, { type CatalogEntry } from "@/components/reseller/ItemFields";
import { btnAccent, btnGhost, cardCls, submitWith } from "@/components/reseller/ui";

export default function AddItemsPanel({
  catalog,
  today,
  startOpen = false,
}: {
  catalog: CatalogEntry[];
  today: string;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const res = await addItems(prev, fd);
      if (res?.ok) setFormKey((k) => k + 1);
      return res;
    },
    undefined
  );

  return (
    <section className={`${cardCls} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Agregar pares</h2>
          <p className="mt-1 text-sm text-muted">
            Registra lo que pagaste, la talla y cuánto esperas cobrar.
          </p>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className={btnGhost} aria-expanded={open}>
          {open ? "Cerrar" : "Nuevo par"}
        </button>
      </div>

      {state?.ok && state.message && (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message}
        </p>
      )}

      {open && (
        <form key={formKey} onSubmit={submitWith(action)} className="mt-6">
          <ItemFields mode="add" catalog={catalog} today={today} />
          {state?.error && (
            <p role="alert" className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
              {state.error}
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={pending} className={btnAccent}>
              {pending ? "Guardando…" : "Guardar al inventario"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
