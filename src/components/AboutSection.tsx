import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function AboutSection() {
  return (
    <section className="bg-paper-raised py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        {/* Reemplaza este bloque por una foto real (equipo, comunidad, punto de verificación) cuando la tengas lista. */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-ink lg:order-2">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              className="h-12 w-12"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="2" />
              <path d="M21 16l-4.5-4.5a2 2 0 0 0-2.8 0L5 21" />
            </svg>
            <span className="text-xs uppercase tracking-widest">Foto próximamente</span>
          </div>
        </div>

        <div className="lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Sobre nosotros
          </p>
          <h2 className="mt-3 font-display text-3xl tracking-wide text-balance sm:text-4xl">
            MÁS QUE UNA TIENDA, UNA COMUNIDAD
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted sm:text-base">
            Pitsneakers nació en {siteConfig.city} como un par de grupos de
            WhatsApp entre personas que compraban, vendían e intercambiaban
            sneakers. Con el tiempo se convirtió en la comunidad que somos
            hoy: {siteConfig.stats.whatsappMembers} miembros en WhatsApp y{" "}
            {siteConfig.stats.instagramFollowers} en Instagram, moviendo
            sneakers y streetwear todos los días.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Seguimos operando como el primer día: cerca de la gente, por
            WhatsApp, cuidando cada negociación como si fuera propia. Lo único
            que cambió es que ahora cada par pasa por un proceso de
            verificación antes de llegar a tus manos.
          </p>
          <Link
            href="/verificacion"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-ink px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-ink/90"
          >
            Cómo trabajamos
          </Link>
        </div>
      </div>
    </section>
  );
}
