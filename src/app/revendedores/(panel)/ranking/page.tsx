import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/ranking";
import {
  LEVELS,
  PODIUM_SLOTS,
  RANK_START,
  levelFor,
  nextLevel,
  type RankPeriod,
} from "@/lib/ranking-shared";
import { cardCls } from "@/components/reseller/ui";
import { PODIUM_SELLERS } from "@/config/ranking";

export const metadata: Metadata = { title: "Ranking de vendedores" };

const plural = (n: number) => `${n} ${n === 1 ? "pedido" : "pedidos"}`;

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await requireUser();
  const { periodo } = await searchParams;
  const period: RankPeriod = periodo === "total" ? "total" : "mes";
  const rows = await getLeaderboard(period, user.id);
  // Podio: vendedores de WhatsApp anotados a mano en src/config/ranking.ts (en "Este mes" solo los que traen dato del mes).
  const podium = PODIUM_SELLERS.map((x) => ({ name: x.name, orders: period === "mes" ? x.month : x.total }))
    .filter((x): x is { name: string; orders: number } => typeof x.orders === "number")
    .sort((a, b) => b.orders - a.orders)
    .slice(0, PODIUM_SLOTS);
  const mine = rows.find((r) => r.userId === user.id);
  const myLevel = mine ? levelFor(mine.orders) : null;
  const myNext = mine ? nextLevel(mine.orders) : null;
  const ahead = mine ? rows.filter((r) => r.orders > mine.orders).length : 0;
  const myProgress = mine && myLevel && myNext ? Math.round(((mine.orders - myLevel.min) / (myNext.min - myLevel.min)) * 100) : 100;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Ranking</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Quién tiene más pedidos en Pitsneakers. Cada par que registras como vendido suma un pedido y te sube de nivel.
        </p>
      </header>

      <nav aria-label="Periodo del ranking" className="flex gap-2 text-xs font-semibold uppercase tracking-wide">
        <Link href="/revendedores/ranking" className={`rounded-full px-4 py-2 ${period === "mes" ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>Este mes</Link>
        <Link href="/revendedores/ranking?periodo=total" className={`rounded-full px-4 py-2 ${period === "total" ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>Todo el tiempo</Link>
      </nav>

      {mine && myLevel && (
        <section className={`${cardCls} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-4 bg-ink px-5 py-5 text-white sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">Tu puesto</p>
              <p className="font-display text-5xl leading-none tracking-wide sm:text-6xl">#{mine.rank}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl leading-none">{myLevel.icon}</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wider">Nivel {myLevel.name}</p>
              <p className="text-xs text-white/60">{plural(mine.orders)}</p>
            </div>
          </div>
          <div className="px-5 py-4 sm:px-6">
            {myNext ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">
                    {myNext.min - mine.orders} {myNext.min - mine.orders === 1 ? "pedido" : "pedidos"} para {myNext.icon} {myNext.name}
                  </span>
                  <span className="text-muted">{myProgress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={myProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso al siguiente nivel">
                  <div className={`rank-bar h-full rounded-full ${myNext.bar}`} style={{ width: `${Math.max(myProgress, 4)}%` }} />
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-ink">Llegaste al nivel máximo. ¡Sigue sumando pedidos!</p>
            )}
            {ahead > 0 && <p className="mt-2 text-xs text-muted">{ahead} {ahead === 1 ? "vendedor tiene" : "vendedores tienen"} más pedidos que tú.</p>}
          </div>
        </section>
      )}

      <section aria-labelledby="podio" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="podio" className="font-display text-2xl tracking-wide">{podium.length ? "Podio" : "Puestos reservados"}</h2>
          <p className="text-xs text-muted">{podium.length ? "Los mejores de la comunidad" : `Del #1 al #${RANK_START - 1} nadie ha llegado todavía`}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {Array.from({ length: PODIUM_SLOTS }, (_, i) => {
            const seller = podium[i];
            if (!seller) {
              return (
                <div key={i} className={`${cardCls} rank-lock relative flex flex-col items-center gap-1 overflow-hidden px-2 py-5 text-center sm:py-7`} style={{ "--i": i } as React.CSSProperties}>
                  <span className="font-display text-3xl tracking-wide text-muted/70 sm:text-5xl">#{i + 1}</span>
                  <span className="rank-lock-icon text-xl sm:text-2xl" aria-hidden="true">🔒</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted sm:text-xs">Sin dueño</span>
                </div>
              );
            }
            const level = levelFor(seller.orders);
            return (
              <div key={i} className={`${cardCls} rank-row relative flex flex-col items-center gap-1 overflow-hidden px-2 py-5 text-center sm:py-7`} style={{ "--i": i } as React.CSSProperties}>
                <span className="font-display text-3xl tracking-wide text-accent sm:text-5xl">#{i + 1}</span>
                <span className="max-w-full truncate text-xs font-semibold text-ink sm:text-sm">{seller.name}</span>
                <span className="text-[11px] text-muted sm:text-xs">{plural(seller.orders)}</span>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${level.badge}`}>
                  <span aria-hidden="true">{level.icon}</span>
                  {level.name}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          {podium.length
            ? "Los puestos del podio son de vendedores de la comunidad que atienden por WhatsApp: su stock no está en la página. "
            : ""}
          El mejor vendedor de la página está en el puesto #{RANK_START}. Cada pedido nuevo te acerca a esos lugares.
        </p>
      </section>

      <section aria-labelledby="tabla" className="space-y-3">
        <h2 id="tabla" className="font-display text-2xl tracking-wide">Clasificación</h2>
        {rows.length === 0 ? (
          <div className={`${cardCls} px-6 py-12 text-center text-sm text-muted`}>Aún no hay vendedores en el ranking.</div>
        ) : (
          <ol className={`${cardCls} divide-y divide-line overflow-hidden`}>
            {rows.map((r, i) => {
              const level = levelFor(r.orders);
              const isMe = r.userId === user.id;
              return (
                <li
                  key={r.userId}
                  className={`rank-row flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 ${isMe ? "bg-accent/10" : ""}`}
                  style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
                  aria-current={isMe ? "true" : undefined}
                >
                  <span className="w-12 shrink-0 font-display text-2xl tracking-wide text-ink/80 sm:w-14 sm:text-3xl">#{r.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {r.name}
                      {isMe && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Tú</span>}
                    </p>
                    <p className="text-xs text-muted">{plural(r.orders)}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${level.badge}`}>
                    <span aria-hidden="true">{level.icon}</span>
                    {level.name}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="niveles" className="space-y-3">
        <h2 id="niveles" className="font-display text-2xl tracking-wide">Niveles</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {LEVELS.map((l) => (
            <li key={l.key} className={`${cardCls} px-4 py-3`}>
              <p className="text-2xl" aria-hidden="true">{l.icon}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{l.name}</p>
              <p className="text-xs text-muted">{l.min === 0 ? "Al empezar" : `Desde ${plural(l.min)}`}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
