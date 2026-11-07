import Link from "next/link";

const SERIF = { fontFamily: "var(--font-serif), Georgia, 'Times New Roman', serif" } as const;

// Mismos colores y rayitas del carrusel del inicio, para que todo se sienta de la misma familia.
const DASHES =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Cpath d='M44 14 52 8' stroke='%23000' stroke-opacity='.45' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E\")";

function Icon({ name }: { name: "search" | "shield" | "box" }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", className: "h-6 w-6", "aria-hidden": true } as const;
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
    bg: "#2a6244",
    ink: "#f4efe0",
  },
  {
    number: "02",
    icon: "shield" as const,
    title: "Autenticación",
    description: "Comparamos contra bases de datos y referencias oficiales de cada marca antes de aprobar la publicación.",
    bg: "#c84028",
    ink: "#fff4ea",
  },
  {
    number: "03",
    icon: "box" as const,
    title: "Consignación segura",
    description: "El producto queda documentado y bajo nuestra intermediación hasta que la venta se cierra con el comprador.",
    bg: "#1f3a5f",
    ink: "#eef3fa",
  },
];

/** Cómo verificamos cada par: tres tarjetas de color que se deslizan de lado en el celular y quedan en fila en pantallas grandes. */
export default function TrustSteps() {
  return (
    <section aria-label="Cómo verificamos cada par" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cómo verificamos cada par</h2>
        <Link href="/verificacion" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent">
          Ver más
          <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
        </Link>
      </div>

      <ol className="no-scrollbar -mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0">
        {steps.map((s) => (
          <li key={s.number} className="w-[82%] shrink-0 snap-start sm:w-0 sm:flex-1">
            <article
              className="flex h-full min-h-[300px] flex-col justify-between rounded-2xl p-6 transition duration-300 hover:-translate-y-1 sm:min-h-[340px] sm:p-8"
              style={{ background: s.bg, backgroundImage: DASHES, color: s.ink }}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-6xl font-medium leading-none sm:text-7xl" style={SERIF}>{s.number}</span>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/25">
                  <Icon name={s.icon} />
                </span>
              </div>
              <div className="mt-10">
                <h3 className="text-3xl font-medium leading-tight sm:text-[2rem]" style={SERIF}>{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed opacity-90">{s.description}</p>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
