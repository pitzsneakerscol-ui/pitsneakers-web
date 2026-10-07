import Link from "next/link";

const KPIS = [
  ["Invertido", "$1.740.000", ""],
  ["Esperado", "$2.320.000", ""],
  ["Utilidad", "+$580.000", "text-emerald-400"],
];

const POINTS = ["Costo, talla y precio por par", "Ganancia real al instante", "Alertas de stock estancado"];

export default function ResellerSection() {
  return (
    <div className="flex h-full flex-col justify-center rounded-lg border border-line bg-paper-raised px-6 py-12 sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        Red Pitsneakers
      </p>
      <h2 className="mt-4 font-display text-3xl leading-[1] tracking-wide text-balance sm:text-4xl">
        CONVIERTE TU STOCK EN UN <span className="text-accent">NEGOCIO DE VERDAD.</span>
      </h2>
      <ul className="mt-4 space-y-1.5 text-sm text-muted sm:text-base">
        {POINTS.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden="true" className="text-accent">▸</span>
            {p}
          </li>
        ))}
      </ul>

      {/* Vista de ejemplo del panel (cifras ilustrativas) */}
      <div aria-hidden="true" className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-ink p-3 text-white">
        {KPIS.map(([label, value, tone]) => (
          <div key={label} className="rounded-md bg-white/5 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/50">{label}</p>
            <p className={`font-display text-base tracking-wide sm:text-lg ${tone}`}>{value}</p>
          </div>
        ))}
        <p className="col-span-3 text-right text-[9px] uppercase tracking-wider text-white/40">Vista de ejemplo</p>
      </div>

      <div className="mt-7">
        <Link
          href="/revendedores"
          className="btn-pop inline-flex items-center justify-center rounded-full bg-accent px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:brightness-110"
        >
          Crear mi cuenta gratis
        </Link>
      </div>
    </div>
  );
}
