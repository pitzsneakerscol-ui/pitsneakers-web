import { LEAGUES, fmtPoints, perkLines, type League } from "@/lib/leagues";
import { Gem } from "@/components/cuenta/LeagueCard";

/**
 * Beneficios de cada liga. `active` es la liga que hoy da beneficios (solo por compras en Pitsneakers);
 * `shown` es la liga de la tarjeta (incluye pares agregados a mano).
 */
export default function PerksCard({ active, shown, verifiedPoints }: { active: League; shown: League; verifiedPoints: number }) {
  const gap = LEAGUES.findIndex((l) => l.key === shown.key) > LEAGUES.findIndex((l) => l.key === active.key);
  const activeIdx = LEAGUES.findIndex((l) => l.key === active.key);

  return (
    <section className="rounded-2xl border border-line bg-paper-raised p-5 sm:p-6">
      <h2 className="font-display text-2xl tracking-wide">Beneficios por liga</h2>
      <p className="mt-1 text-sm text-muted">
        Hoy tus beneficios son los de <strong style={{ color: active.to }}>{active.label}</strong>. Cada liga incluye todo lo anterior y mejora los números.
      </p>
      {gap && (
        <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
          Tu liga es {shown.label}, pero los beneficios se activan con los puntos de lo que compras en Pitsneakers ({fmtPoints(verifiedPoints)} hoy). Los pares agregados a mano suben tu liga, no los beneficios.
        </p>
      )}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEAGUES.map((l, i) => {
          const on = i <= activeIdx;
          const here = i === activeIdx;
          return (
            <li key={l.key} className={`rounded-xl border p-4 ${here ? "border-ink/40 bg-ink/[0.05]" : "border-line"} ${on ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <Gem league={l} size={34} dim={!on} />
                <div>
                  <p className="font-display text-xl leading-none tracking-wide" style={{ color: l.to }}>{l.label}</p>
                  <p className="text-[11px] text-muted">{here ? "Tu nivel de beneficios" : `Desde ${l.min} puntos`}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs">
                {perkLines(l.key).map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden="true" style={{ color: l.to }}>✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
