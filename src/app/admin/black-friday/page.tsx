import type { Metadata } from "next";
import Link from "next/link";
import { listBfProposals, type BfStatus } from "@/lib/bf-prices";
import { formatPrice } from "@/lib/format";
import { ago } from "@/lib/admin-shared";
import { btnAccent, btnGhost, cardCls, inputCls } from "@/components/reseller/ui";
import { approveAllPendingBf, decideBf } from "./actions";

export const metadata: Metadata = { title: "Black Friday" };
export const dynamic = "force-dynamic";

const STATUS: Record<BfStatus, { label: string; cls: string }> = {
  pendiente: { label: "Por revisar", cls: "bg-amber-100 text-amber-800" },
  aprobado: { label: "Aprobado", cls: "bg-emerald-100 text-emerald-800" },
  rechazado: { label: "Rechazado", cls: "bg-line text-muted" },
};

export default async function BlackFridayAdminPage({ searchParams }: { searchParams: Promise<{ f?: string; v?: string }> }) {
  const { f, v } = await searchParams;
  const filter: BfStatus | "todas" = f === "aprobado" || f === "rechazado" || f === "todas" ? f : "pendiente";
  const all = await listBfProposals();
  const count = (s: BfStatus) => all.filter((p) => p.status === s).length;
  const seller = v ? all.filter((p) => String(p.userId) === v) : all;
  const rows = filter === "todas" ? seller : seller.filter((p) => p.status === filter);
  const sellers = [...new Map(all.map((p) => [p.userId, p.sellerName])).entries()];
  const qs = (next: Record<string, string>) => {
    const merged: Record<string, string> = { ...(f ? { f } : {}), ...(v ? { v } : {}), ...next };
    const p = new URLSearchParams(Object.entries(merged).filter(([, val]) => val));
    return `/admin/black-friday${p.size ? `?${p.toString()}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Black Friday</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Los pares que tus vendedores quieren ofrecer en Black Friday, con el precio que proponen. Solo los que apruebas salen en la página con su descuento. Si cambian el precio, vuelve a quedar por revisar.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        {([
          ["Por revisar", count("pendiente")],
          ["Aprobados", count("aprobado")],
          ["Rechazados", count("rechazado")],
          ["Vendedores participando", sellers.length],
        ] as const).map(([label, n]) => (
          <div key={label} className={`${cardCls} p-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1 font-display text-3xl tracking-wide">{n}</p>
          </div>
        ))}
      </section>

      {count("pendiente") > 0 && (
        <form action={approveAllPendingBf} className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
          <div>
            <label htmlFor="min" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">Aprobar todo lo pendiente con al menos</label>
            <div className="relative w-32">
              <input id="min" name="min" type="number" min={0} max={90} defaultValue={10} className={`${inputCls} pr-8`} />
              <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
            </div>
          </div>
          <button type="submit" className={btnAccent}>Aprobar los que cumplen</button>
          <p className="text-xs text-muted">Los de menos descuento se quedan por revisar uno por uno.</p>
        </form>
      )}

      <nav aria-label="Filtrar" className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        {([["pendiente", "Por revisar"], ["aprobado", "Aprobados"], ["rechazado", "Rechazados"], ["todas", "Todas"]] as const).map(([k, label]) => (
          <Link key={k} href={qs({ f: k })} className={`rounded-full px-4 py-2 ${filter === k ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>{label}</Link>
        ))}
        {sellers.length > 1 && (
          <span className="ml-2 flex flex-wrap items-center gap-2 normal-case tracking-normal">
            {v && <Link href={qs({ v: "" })} className="underline">Todos los vendedores</Link>}
            {sellers.map(([id, name]) => (
              <Link key={id} href={qs({ v: String(id) })} className={`rounded-full px-3 py-1.5 text-[11px] ${String(id) === v ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>{name}</Link>
            ))}
          </span>
        )}
      </nav>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>
          {all.length === 0 ? "Todavía ningún vendedor propuso pares para Black Friday." : "No hay propuestas en este filtro."}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const st = STATUS[p.status];
            return (
              <li key={p.sku} className={`${cardCls} flex flex-col gap-4 p-4 sm:flex-row sm:items-center`}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-paper object-contain" />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-paper" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.brand} {p.name}</p>
                    <p className="text-xs text-muted">
                      {p.sizes.length ? `Talla ${p.sizes.join(", ")} · ` : ""}
                      <Link href={`/admin/revendedores/${p.userId}`} className="underline">{p.sellerName}</Link> · {ago(p.updatedAt)}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-muted line-through">{formatPrice(p.price)}</span> → <strong>{formatPrice(p.bfPrice)}</strong>{" "}
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">−{p.pct}%</span>
                    </p>
                    {p.status === "rechazado" && p.note && <p className="mt-1 text-xs text-muted">Motivo: {p.note}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:w-72">
                  <span className={`self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                  <form action={decideBf} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="sku" value={p.sku} />
                    <input name="note" placeholder="Motivo (si lo rechazas)" maxLength={200} className={`${inputCls} min-w-0 flex-1 py-2`} />
                    <button type="submit" name="decision" value="aprobado" className={btnAccent} disabled={p.status === "aprobado"}>Aprobar</button>
                    <button type="submit" name="decision" value="rechazado" className={btnGhost} disabled={p.status === "rechazado"}>Rechazar</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
