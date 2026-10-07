"use client";

import { useActionState, useState } from "react";
import { addItems } from "@/app/revendedores/actions";
import type { ActionState } from "@/lib/reseller-shared";
import type { CatalogEntry } from "@/components/reseller/ItemFields";
import AddWizard from "@/components/reseller/AddWizard";
import { btnGhost, cardCls } from "@/components/reseller/ui";

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
  const [dismissed, setDismissed] = useState<ActionState>(undefined);
  const [state, action, pending] = useActionState(addItems, undefined);

  // La pantalla de "¡Listo!" se muestra mientras no la hayas cerrado.
  const success = Boolean(state?.ok) && state !== dismissed;

  return (
    <section className={`${cardCls} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Agregar pares</h2>
          <p className="mt-1 text-sm text-muted">Te guiamos en 4 pasos: qué par, talla, cuánto y detalles.</p>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className={btnGhost} aria-expanded={open}>
          {open ? "Cerrar" : "+ Nuevo par"}
        </button>
      </div>

      {open && (
        <div className="mt-6">
          <AddWizard
            key={formKey}
            catalog={catalog}
            today={today}
            action={action}
            pending={pending}
            error={state?.error}
            success={success}
            message={state?.message}
            onReset={() => {
              setDismissed(state);
              setFormKey((k) => k + 1);
            }}
            onClose={() => {
              setDismissed(state);
              setOpen(false);
            }}
          />
        </div>
      )}
    </section>
  );
}
