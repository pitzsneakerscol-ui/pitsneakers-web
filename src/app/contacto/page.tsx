import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos por WhatsApp o Instagram — así cerramos siempre las ventas en Pitsneakers.",
};

const channels = [
  {
    title: "WhatsApp",
    description: "El canal más rápido. Cuéntanos qué buscas o consulta por un producto puntual.",
    action: "Escribir por WhatsApp",
    href: buildGeneralWhatsAppLink("Hola! Quiero más información sobre Pitsneakers"),
    style: "bg-whatsapp hover:bg-whatsapp-dark text-white",
  },
  {
    title: "Comunidad de WhatsApp",
    description: `Únete a uno de nuestros ${siteConfig.stats.whatsappGroups} grupos y entérate primero de cada lanzamiento.`,
    action: "Unirme al grupo",
    href: siteConfig.whatsappCommunityUrl,
    style: "bg-ink hover:bg-ink/90 text-white",
  },
  {
    title: "Instagram",
    description: `Síguenos en ${siteConfig.instagramHandle} para ver drops, fotos reales y reseñas de la comunidad.`,
    action: "Ver Instagram",
    href: siteConfig.instagramUrl,
    style: "border border-line hover:border-ink text-ink",
  },
];

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Contacto
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">
          Hablemos por WhatsApp
        </h1>
        <p className="mt-4 text-sm text-muted sm:text-base">
          No manejamos formularios ni carrito de compras: todo se negocia por
          chat, como lo hemos hecho siempre con la comunidad. Elige el canal
          que prefieras.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {channels.map((channel) => (
          <div
            key={channel.title}
            className="flex flex-col justify-between rounded-lg border border-line bg-paper-raised p-6"
          >
            <div>
              <h2 className="text-base font-semibold">{channel.title}</h2>
              <p className="mt-2 text-sm text-muted">{channel.description}</p>
            </div>
            <a
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-wide transition ${channel.style}`}
            >
              {channel.action}
            </a>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-muted">
        {siteConfig.city} · Respondemos por WhatsApp en horario habitual de la
        comunidad.
      </p>
    </div>
  );
}
