import Link from "next/link";
import { getSyncPlan } from "@/lib/seller-sync";
import { cardCls } from "@/components/reseller/ui";
import SyncButton from "@/components/admin/SyncButton";

/** Pares del catálogo con vendedor asignado (columna VENDEDOR) y qué falta cargar en cada cuenta. */
export default async function SellerSyncPanel() {
  const plan = await getSyncPlan();
  const totalPending = plan.reduce((s, r) => (r.userId !== null ? s + r.pending.length : s), 0);

  return (
    <section className={`${cardCls} p-5 sm:p-6`}>
      <h2 className="font-display text-2xl tracking-wide">Pares con vendedor</h2>
      <p className="mt-1 text-sm text-muted">
        Los pares que publicas en el catálogo con un <strong className="text-ink">@usuario</strong> se cargan solos en la cuenta de esa persona al sincronizar.
        Si todavía no tiene cuenta, el par se queda esperando hasta que se la crees con ese mismo usuario.
      </p>

      {plan.length === 0 ? (
        <p className="mt-4 rounded-lg bg-paper px-4 py-3 text-sm text-muted">Aún no hay pares con vendedor asignado.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {plan.map((r) => (
            <li key={r.seller} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {r.userId !== null ? (
                    <Link href={`/admin/revendedores/${r.userId}`} className="hover:underline">{r.seller.includes("@") ? "" : "@"}{r.seller}</Link>
                  ) : (
                    <>{r.seller.includes("@") ? "" : "@"}{r.seller}</>
                  )}
                  {r.displayName && r.displayName !== r.seller && <span className="ml-2 font-normal text-muted">{r.displayName}</span>}
                </p>
                <p className="text-xs text-muted">
                  {r.pending.length ? `${r.pending.length} por cargar: ${r.pending.slice(0, 3).map((p) => `${p.name}${p.size ? ` (${p.size})` : ""}`).join(", ")}${r.pending.length > 3 ? "…" : ""}` : "Todo cargado"}
                  {r.loaded ? ` · ${r.loaded} ya en su inventario` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${r.userId === null ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                {r.userId === null ? "Sin cuenta aún" : "Con cuenta"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {plan.length > 0 && (
        <div className="mt-4">
          <SyncButton disabled={totalPending === 0} />
        </div>
      )}
    </section>
  );
}
