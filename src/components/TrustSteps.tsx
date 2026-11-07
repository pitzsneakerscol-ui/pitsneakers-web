import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Revisión física",
    description: "Cada par o prenda se inspecciona a mano: costuras, materiales, empaque y detalles de fábrica.",
  },
  {
    number: "02",
    title: "Autenticación",
    description: "Comparamos contra bases de datos y referencias oficiales de cada marca antes de aprobar la publicación.",
  },
  {
    number: "03",
    title: "Consignación segura",
    description: "El producto queda documentado y bajo nuestra intermediación hasta que la venta se cierra con el comprador.",
  },
];

/** Cómo verificamos cada par: tres pasos en texto, sin adornos. */
export default function TrustSteps() {
  return (
    <section aria-label="Cómo verificamos cada par" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl uppercase tracking-wide sm:text-3xl">
          Cómo verificamos <span className="text-accent">cada par</span>
        </h2>
        <Link href="/verificacion" className="shrink-0 text-sm font-semibold text-accent hover:underline">
          Ver más →
        </Link>
      </div>

      <ol className="mt-5 grid gap-5 border-t border-line pt-5 sm:grid-cols-3 sm:gap-8">
        {steps.map((s) => (
          <li key={s.number} className="flex gap-2">
            <span className="w-8 shrink-0 font-display text-2xl leading-none text-accent">{s.number}</span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-none">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
