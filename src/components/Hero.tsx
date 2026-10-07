import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import PointerTilt from "@/components/PointerTilt";

const HEADLINE = ["SNEAKERS", "Y", "STREETWEAR,", "VERIFICADOS", "PAR", "A", "PAR."];

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

      <div className="relative mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:gap-12 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:px-8 lg:py-32">
        <div className="order-2 flex flex-col lg:order-1">
          <p
            className="fade-up text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50 sm:text-xs sm:tracking-[0.3em]"
            style={{ "--delay": "0ms" } as React.CSSProperties}
          >
            {siteConfig.city} · Compra, vende e intercambia
          </p>
          <h1 className="mt-3 max-w-3xl sm:mt-6 font-display text-5xl leading-[0.95] tracking-wide text-balance sm:text-7xl lg:text-8xl">
            {HEADLINE.map((word, i) => (
              <span key={i}>
                <span
                  className={`hero-word ${word === "VERIFICADOS" ? "hero-underline text-accent" : ""}`}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  {word}
                </span>
                {i < HEADLINE.length - 1 ? " " : ""}
              </span>
            ))}
          </h1>
          <p
            className="fade-up mt-4 max-w-xl text-sm text-white/70 sm:mt-6 sm:text-lg"
            style={{ "--delay": "700ms" } as React.CSSProperties}
          >
            Cada producto pasa por revisión física y autenticación antes de
            llegar a ti. Consulta el catálogo y cierra tu compra directo por
            WhatsApp, como siempre lo has hecho con nosotros.
          </p>
          <div
            className="fade-up mt-6 flex gap-3 sm:mt-10"
            style={{ "--delay": "900ms" } as React.CSSProperties}
          >
            <Link
              href="/sneakers"
              className="btn-pop btn-shine inline-flex flex-1 items-center justify-center rounded-full bg-white px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-ink hover:bg-white/90 sm:flex-none sm:px-8 sm:py-4 sm:text-sm"
            >
              Ver catálogo
            </Link>
            <Link
              href="/verificacion"
              className="btn-pop inline-flex flex-1 items-center justify-center rounded-full border border-white/30 px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-white hover:border-accent hover:text-accent sm:flex-none sm:px-8 sm:py-4 sm:text-sm"
            >
              Cómo verificamos
            </Link>
          </div>
        </div>

        <div className="relative order-1 flex justify-center lg:order-2 lg:justify-end">
          <div
            className="glow-pulse pointer-events-none absolute h-40 w-40 rounded-full blur-3xl sm:h-80 sm:w-80"
            style={{
              background:
                "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
            }}
          />
          <PointerTilt>
            <Image
              src="/logo-pitsneakers.png"
              alt="Pitsneakers"
              width={2048}
              height={2048}
              sizes="(min-width: 1024px) 320px, 256px"
              priority
              className="mascot relative h-32 w-32 sm:h-64 sm:w-64 lg:h-80 lg:w-80"
            />
          </PointerTilt>
        </div>
      </div>
      <div className="checker-strip" aria-hidden="true" />
    </section>
  );
}
