import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import StepsCarousel from "@/components/StepsCarousel";
import CommunityStats from "@/components/CommunityStats";

export const metadata: Metadata = {
  title: "Encargos VIP",
  description:
    "¿No encuentras el par que buscas en el catálogo? Pídelo con nuestro servicio de Encargos VIP y activamos toda la comunidad para conseguirlo.",
};

const steps = [
  {
    number: "01",
    title: "Nos cuentas qué buscas",
    description:
      "Modelo, colorway, talla y el precio que estás dispuesto a pagar. Entre más detalle nos des, más rápido lo encontramos.",
  },
  {
    number: "02",
    title: "Activamos la red VIP",
    description:
      "Movemos tu encargo entre nuestros vendedores de confianza y los 6 grupos de la comunidad antes de que salga público.",
  },
  {
    number: "03",
    title: "Te avisamos apenas aparece",
    description:
      "En cuanto encontramos un candidato, te mandamos fotos reales por WhatsApp para que apruebes antes de seguir.",
  },
  {
    number: "04",
    title: "Verificación y consignación segura",
    description:
      "El par pasa por el mismo proceso de autenticación de siempre antes de llegar a tus manos.",
  },
];

export default function EncargosPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            Servicio VIP
          </p>
          <h1 className="mt-4 font-display text-4xl tracking-wide sm:text-6xl text-balance">
            ¿NO LO ENCUENTRAS? <span className="text-accent">LO CONSEGUIMOS</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-white/70 sm:text-base">
            Si el par que buscas no está en el catálogo, pídelo por encargo.
            Activamos nuestra red de vendedores y la comunidad de{" "}
            {siteConfig.stats.whatsappMembers} miembros para conseguirlo antes
            que nadie.
          </p>
          <a
            href={buildGeneralWhatsAppLink(
              "Hola! Quiero hacer un encargo VIP. Estoy buscando: "
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-whatsapp px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark"
          >
            Solicitar mi par
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Cómo funciona
        </p>
        <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
          De tu pedido a tu puerta
        </h2>
        <div className="mt-10">
          <StepsCarousel steps={steps} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="rounded-lg border border-line bg-paper-raised p-8 sm:p-10">
          <h2 className="font-display text-2xl tracking-wide">
            ¿Por qué pedir un encargo?
          </h2>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            <li>· Acceso prioritario a pares que ni siquiera llegan a publicarse en el catálogo.</li>
            <li>· No dependes de encontrar tu talla exacta ya publicada.</li>
            <li>· Mismo proceso de verificación y consignación segura de siempre.</li>
            <li>· Comunicación directa por WhatsApp, sin formularios ni intermediarios.</li>
          </ul>
          <a
            href={buildGeneralWhatsAppLink(
              "Hola! Quiero hacer un encargo VIP. Estoy buscando: "
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-whatsapp px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark"
          >
            Solicitar mi par
          </a>
        </div>
      </section>

      <CommunityStats />
    </div>
  );
}
