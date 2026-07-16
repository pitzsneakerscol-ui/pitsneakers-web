import Link from "next/link";
import StepsCarousel from "@/components/StepsCarousel";

const steps = [
  {
    number: "01",
    title: "Revisión física",
    description:
      "Cada par o prenda se inspecciona a mano: costuras, materiales, empaque y detalles de fábrica.",
  },
  {
    number: "02",
    title: "Autenticación",
    description:
      "Comparamos contra bases de datos y referencias oficiales de cada marca antes de aprobar la publicación.",
  },
  {
    number: "03",
    title: "Consignación segura",
    description:
      "El producto queda documentado y bajo nuestra intermediación hasta que la venta se cierra con el comprador.",
  },
];

export default function TrustSteps() {
  return (
    <section className="bg-paper-raised py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Confianza
          </p>
          <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
            Cómo verificamos cada par
          </h2>
        </div>

        <div className="mt-10">
          <StepsCarousel steps={steps} cardClassName="bg-paper" showArrows={false} />
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/verificacion"
            className="inline-flex items-center justify-center rounded-full border border-ink/20 px-8 py-4 text-sm font-semibold uppercase tracking-wide text-ink transition hover:border-ink/50"
          >
            Ver más
          </Link>
        </div>
      </div>
    </section>
  );
}
