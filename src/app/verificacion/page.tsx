import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import CommunityStats from "@/components/CommunityStats";
import Testimonials from "@/components/Testimonials";
import StepsCarousel from "@/components/StepsCarousel";

export const metadata: Metadata = {
  title: "Verificación",
  description: "Cómo Pitsneakers verifica la autenticidad de cada par y prenda antes de publicarlo.",
};

const steps = [
  {
    number: "01",
    title: "El vendedor consigna el producto",
    description:
      "Recibimos el par o la prenda de manos del vendedor externo junto con su información: talla, estado, empaque original y precio esperado.",
  },
  {
    number: "02",
    title: "Revisión física completa",
    description:
      "Nuestro equipo revisa costuras, materiales, etiquetas, empaque, olor y desgaste. Cualquier detalle fuera de lugar detiene el proceso.",
  },
  {
    number: "03",
    title: "Autenticación contra referencias oficiales",
    description:
      "Comparamos el producto contra bases de datos y referencias de fábrica de cada marca para confirmar que es 100% original.",
  },
  {
    number: "04",
    title: "Publicación con sello de verificado",
    description:
      "Solo lo que pasa el proceso completo se publica en el catálogo con el sello \"Verificado por Pitsneakers\".",
  },
  {
    number: "05",
    title: "Venta intermediada de forma segura",
    description:
      "Cerramos la negociación por WhatsApp y coordinamos la entrega. Cobramos una comisión del " +
      `${siteConfig.commission.percent}% del valor de venta (mínimo $${siteConfig.commission.minimum.toLocaleString("es-CO")} COP) — el vendedor recibe el resto una vez confirmada la entrega.`,
  },
];

export default function VerificacionPage() {
  return (
    <div>
      <section className="bg-ink py-20 text-white sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            Sobre nosotros
          </p>
          <h1 className="mt-4 font-display text-4xl tracking-wide sm:text-6xl text-balance">
            LA GARANTÍA DETRÁS DE CADA PAR
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-white/70 sm:text-base">
            Pitsneakers nació como una comunidad de reventa por WhatsApp e
            Instagram en {siteConfig.city}. Hoy seguimos operando igual — pero
            con un proceso de verificación que protege a compradores y
            vendedores en cada transacción.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Paso a paso
        </p>
        <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
          Así verificamos cada producto
        </h2>
        <div className="mt-10">
          <StepsCarousel steps={steps} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="rounded-lg border border-line bg-paper-raised p-8 sm:p-10">
          <h2 className="font-display text-2xl tracking-wide">
            ¿Qué garantía te da esto como comprador?
          </h2>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            <li>· Autenticidad verificada antes de que el producto se publique.</li>
            <li>· Intermediación de Pitsneakers durante toda la negociación y entrega.</li>
            <li>· Historial de la comunidad: más de {siteConfig.stats.whatsappMembers} miembros activos que compran y venden con nosotros.</li>
            <li>· Comunicación directa y sin intermediarios de pago — negocias precio y condiciones por WhatsApp, como siempre.</li>
          </ul>
          <a
            href={buildGeneralWhatsAppLink(
              "Hola! Tengo una pregunta sobre el proceso de verificación de Pitsneakers"
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-whatsapp px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark"
          >
            Tengo una pregunta
          </a>
        </div>
      </section>

      <Testimonials />
      <CommunityStats />
    </div>
  );
}
