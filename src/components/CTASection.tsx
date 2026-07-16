import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export default function CTASection() {
  return (
    <section className="bg-paper-raised py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl tracking-wide sm:text-5xl text-balance">
          ÚNETE A LA COMUNIDAD PITSNEAKERS
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted sm:text-base">
          Sé el primero en enterarte de lanzamientos, drops y ofertas exclusivas
          de la comunidad de reventa más grande de Bogotá.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={siteConfig.whatsappCommunityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-whatsapp px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark"
          >
            Unirme al grupo de WhatsApp
          </a>
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-ink/20 px-8 py-4 text-sm font-semibold uppercase tracking-wide text-ink transition hover:border-ink/50"
          >
            Seguir en Instagram
          </a>
        </div>
        <a
          href={buildGeneralWhatsAppLink(
            "Hola! Quiero más información sobre Pitsneakers"
          )}
          className="mt-4 inline-block text-xs text-muted underline underline-offset-4 hover:text-ink"
        >
          o escríbenos directo por WhatsApp
        </a>
      </div>
    </section>
  );
}
