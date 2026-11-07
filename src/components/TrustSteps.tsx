import Link from "next/link";

function Icon({ name }: { name: "search" | "shield" | "box" }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4", "aria-hidden": true } as const;
  if (name === "search")
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.2-4.2" />
      </svg>
    );
  if (name === "shield")
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5.5c0 4.4 2.9 7.6 7 9.5 4.1-1.9 7-5.1 7-9.5V6l-7-3Z" />
        <path d="m9 12 2.2 2.2L15.5 10" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z" />
      <path d="m4 7.2 8 4.3 8-4.3M12 11.5V21" />
    </svg>
  );
}

const steps = [
  {
    number: "01",
    icon: "search" as const,
    title: "Revisión física",
    description: "Cada par o prenda se inspecciona a mano: costuras, materiales, empaque y detalles de fábrica.",
  },
  {
    number: "02",
    icon: "shield" as const,
    title: "Autenticación",
    description: "Comparamos contra bases de datos y referencias oficiales de cada marca antes de aprobar la publicación.",
  },
  {
    number: "03",
    icon: "box" as const,
    title: "Consignación segura",
    description: "El producto queda documentado y bajo nuestra intermediación hasta que la venta se cierra con el comprador.",
  },
];

/** Cómo verificamos cada par: banda negra con la cuadrícula del hero, números en Anton y naranja de la marca. Compacta. */
export default function TrustSteps() {
  return (
    <section aria-label="Cómo verificamos cada par" className="relative overflow-hidden bg-ink text-white">
      <div className="checker-strip" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
              <span aria-hidden="true" className="nav-dot" style={{ ["--glow" as string]: "#c84028" }} />
              Confianza
            </p>
            <h2 className="mt-2 font-display text-3xl uppercase leading-none tracking-wide sm:text-4xl">
              Cómo verificamos <span className="text-accent">cada par</span>
            </h2>
          </div>
          <Link href="/verificacion" className="group hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-white/80 transition hover:text-white sm:inline-flex">
            Ver más
            <span aria-hidden="true" className="text-accent transition group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <ol className="no-scrollbar scroll-pl-4 sm:scroll-pl-0 -mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0">
          {steps.map((s) => (
            <li key={s.number} className="flex w-[84%] shrink-0 snap-start gap-3 rounded-xl border border-white/15 bg-white/[0.04] p-4 transition hover:border-accent/70 sm:w-auto sm:flex-col sm:gap-3">
              <span className="font-display text-4xl leading-none text-accent sm:text-5xl">{s.number}</span>
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Icon name={s.icon} />
                  </span>
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/65">{s.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <Link href="/verificacion" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 sm:hidden">
          Ver más <span aria-hidden="true" className="text-accent">→</span>
        </Link>
      </div>
    </section>
  );
}
