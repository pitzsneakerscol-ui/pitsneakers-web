import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:px-8 lg:py-32">
        <div className="order-2 flex flex-col lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            {siteConfig.city} · Compra, vende e intercambia
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[0.95] tracking-wide text-balance sm:text-7xl lg:text-8xl">
            SNEAKERS Y STREETWEAR, <span className="text-accent">VERIFICADOS</span> PAR A PAR.
          </h1>
          <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg">
            Cada producto pasa por revisión física y autenticación antes de
            llegar a ti. Consulta el catálogo y cierra tu compra directo por
            WhatsApp, como siempre lo has hecho con nosotros.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sneakers"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-ink transition hover:bg-white/90"
            >
              Ver catálogo
            </Link>
            <Link
              href="/verificacion"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-white/60"
            >
              Cómo verificamos
            </Link>
          </div>
        </div>

        <div className="relative order-1 flex justify-center lg:order-2 lg:justify-end">
          <div
            className="pointer-events-none absolute h-64 w-64 rounded-full opacity-40 blur-3xl sm:h-80 sm:w-80"
            style={{
              background:
                "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
            }}
          />
          <Image
            src="/logo-pitsneakers.png"
            alt="Pitsneakers"
            width={2048}
            height={2048}
            priority
            className="relative h-48 w-48 sm:h-64 sm:w-64 lg:h-80 lg:w-80"
          />
        </div>
      </div>
    </section>
  );
}
