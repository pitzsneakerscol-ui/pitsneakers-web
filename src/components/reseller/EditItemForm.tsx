"use client";

import { useActionState } from "react";
import { updateItem } from "@/app/revendedores/actions";
import type { ActionState, Item } from "@/lib/reseller-shared";
import ItemFields, { type CatalogEntry } from "@/components/reseller/ItemFields";
import { btnAccent, submitWith } from "@/components/reseller/ui";

export default function EditItemForm({
  item,
  catalog,
  today,
  onDone,
}: {
  item: Item;
  catalog: CatalogEntry[];
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const res = await updateItem(prev, fd);
      if (res?.ok) onDone();
      return res;
    },
    undefined
  );

  return (
    <form onSubmit={submitWith(action)}>
      <input type="hidden" name="id" value={item.id} />
      <ItemFields mode="edit" catalog={catalog} today={today} item={item} />
      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
          {state.error}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={pending} className={btnAccent}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
