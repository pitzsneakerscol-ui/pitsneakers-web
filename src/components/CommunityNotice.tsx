import { siteConfig } from "@/config/site";

export default function CommunityNotice() {
  return (
    <div className="mt-16 flex flex-col items-center gap-4 rounded-lg border border-line bg-paper-raised px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="text-sm text-muted">
        Este catálogo es solo una parte de lo que se mueve todos los días en
        la comunidad. Únete a nuestros grupos de WhatsApp para ver todo lo
        disponible.
      </p>
      <a
        href={siteConfig.whatsappCommunityUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-whatsapp px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark"
      >
        Unirme al grupo de WhatsApp
      </a>
    </div>
  );
}
