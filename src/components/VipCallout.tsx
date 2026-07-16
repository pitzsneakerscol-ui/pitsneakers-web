import Link from "next/link";

export default function VipCallout() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <div className="relative overflow-hidden rounded-lg bg-ink px-6 py-14 text-center text-white sm:px-12 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
          Servicio VIP
        </p>
        <h2 className="relative mx-auto mt-4 max-w-xl font-display text-3xl tracking-wide text-balance sm:text-4xl">
          ¿NO ENCUENTRAS EL PAR QUE BUSCAS? PÍDELO POR ENCARGO.
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-sm text-white/70 sm:text-base">
          Activamos nuestra red de vendedores y toda la comunidad para
          conseguirte esos pares difíciles de encontrar, antes de que salgan
          al público.
        </p>
        <Link
          href="/encargos"
          className="relative mt-8 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-ink transition hover:bg-white/90"
        >
          Conocer el servicio
        </Link>
      </div>
    </section>
  );
}
