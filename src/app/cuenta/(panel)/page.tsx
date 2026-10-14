import Link from "next/link";
import { redirect } from "next/navigation";
import { getBuyer } from "@/lib/buyers";
import { buildCollection, type ValueBasis } from "@/lib/collection";
import { formatPrice } from "@/lib/format";
import { cardCls } from "@/components/reseller/ui";
import { AddPairForm } from "@/components/cuenta/CuentaForms";
import Thumb from "@/components/cuenta/Thumb";
import LeagueCard from "@/components/cuenta/LeagueCard";
import { fmtPoints, leagueFor } from "@/lib/leagues";
import PerksCard from "@/components/cuenta/PerksCard";
import { removePair } from "../actions";

const BASIS: Record<ValueBasis, string> = {
  catalogo: "Precio actual en Pitsneakers",
  venta: "Última venta en Pitsneakers",
  compra: "Lo que pagaste",
};

export default async function ColeccionPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  const { nuevo } = await searchParams;
  const col = await buildCollection(buyer);
  const diff = col.value - col.paid;
  const pct = col.paid > 0 ? Math.round((diff / col.paid) * 100) : 0;

  return (
    <div className="space-y-6">
      {nuevo === "1" && (
        <p role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          ¡Cuenta creada! Revisa tu correo para confirmarlo; después de confirmarlo aparecerán aquí tus compras en Pitsneakers.
        </p>
      )}

      <LeagueCard status={col.league} pairs={col.items.length} />

      {col.best && col.items.length > 1 && (
        <p className="text-sm text-muted">
          Tu mejor par: <strong className="text-ink">{col.best.name}</strong>{col.best.size ? ` talla ${col.best.size}` : ""} · {formatPrice(col.best.value)} aprox. ({col.best.rarity.label})
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className={`${cardCls} p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pares</p>
          <p className="mt-1 font-display text-4xl tracking-wide tabular-nums">{col.items.length}</p>
        </div>
        <div className={`${cardCls} p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Valor aproximado</p>
          <p className="mt-1 font-display text-4xl tracking-wide tabular-nums">{formatPrice(col.value)}</p>
          {col.items.length > 0 && col.paid > 0 && (
            <p className={`mt-1 text-xs font-semibold ${diff >= 0 ? "text-emerald-700" : "text-accent"}`}>
              {diff >= 0 ? "▲" : "▼"} {formatPrice(Math.abs(diff))} ({pct >= 0 ? "+" : ""}{pct}%) frente a lo que pagaste
            </p>
          )}
        </div>
        <div className={`${cardCls} p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pagado en total</p>
          <p className="mt-1 font-display text-4xl tracking-wide tabular-nums">{formatPrice(col.paid)}</p>
        </div>
      </section>

      {col.items.length === 0 ? (
        <div className={`${cardCls} px-6 py-12 text-center`}>
          <p className="font-display text-2xl tracking-wide">Tu colección está vacía</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {buyer.verified ? "Cuando compres un par en Pitsneakers aparece aquí solo (con el mismo correo de tu cuenta)." : "Confirma tu correo para ver tus compras en Pitsneakers."} También puedes agregar a mano los pares que ya tienes.
          </p>
          <Link href="/sneakers" className="btn-pop mt-5 inline-flex items-center justify-center rounded-full bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-wide text-white">Ver sneakers</Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {col.items.map((i) => {
            const d = i.value - i.paid;
            return (
              <li key={i.key} className={`${cardCls} flex gap-4 p-4`}>
                <Thumb image={i.image} brand={i.brand} name={i.name} className="h-24 w-24" />
                <div className="min-w-0 flex-1">
                  <p className="mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${i.rarity.cls}`}>
                      {i.rarity.label} · +{fmtPoints(i.points)}
                    </span>
                  </p>
                  <p className="truncate font-semibold">
                    {i.slug ? <Link href={`/producto/${i.slug}`} className="hover:text-accent">{i.name}</Link> : i.name}
                  </p>
                  <p className="text-xs text-muted">{i.brand}{i.brand && i.size ? " · " : ""}{i.size ? `talla ${i.size}` : ""}</p>
                  <p className="mt-2 text-sm">
                    <span className="text-muted">Pagaste</span> {formatPrice(i.paid)}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted">Vale aprox.</span> <strong>{formatPrice(i.value)}</strong>
                    {i.basis !== "compra" && i.paid > 0 && d !== 0 && <span className={`ml-1.5 text-xs font-semibold ${d > 0 ? "text-emerald-700" : "text-accent"}`}>{d > 0 ? "▲" : "▼"}{Math.round(Math.abs(d / i.paid) * 100)}%</span>}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">{BASIS[i.basis]}</p>
                  {i.manualId !== null && (
                    <form action={removePair} className="mt-2">
                      <input type="hidden" name="id" value={i.manualId} />
                      <button type="submit" className="text-[11px] font-semibold uppercase tracking-wide text-muted underline underline-offset-4 hover:text-accent">Quitar</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PerksCard active={leagueFor(col.verifiedPoints).current} shown={col.league.current} verifiedPoints={col.verifiedPoints} />

      <p className="text-xs text-muted">
        El valor es una estimación: usamos el precio al que Pitsneakers vende hoy ese modelo (o su última venta). No es una tasación ni una promesa de recompra.
      </p>

      <details className={`${cardCls} p-5 sm:p-6`}>
        <summary className="cursor-pointer font-display text-2xl tracking-wide">Agregar un par que ya tengo</summary>
        <p className="mb-4 mt-2 text-sm text-muted">Para pares que compraste en otro lado. Escribe el nombre como aparece en el catálogo y calculamos su valor aproximado.</p>
        <AddPairForm />
      </details>
    </div>
  );
}
