"use client";

import { useActionState } from "react";
import { syncSellerCatalog } from "@/app/admin/actions";
import { btnAccent, submitWith } from "@/components/reseller/ui";

export default function SyncButton({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(syncSellerCatalog, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-3">
      <button type="submit" disabled={pending || disabled} className={btnAccent}>
        {pending ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
      {state?.error && <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>}
      {state?.ok && state.message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>}
    </form>
  );
}
