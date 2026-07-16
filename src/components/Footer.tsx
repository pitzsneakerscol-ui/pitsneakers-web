import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/logo-pitsneakers.png"
              alt="Pitsneakers"
              width={2048}
              height={2048}
              className="h-12 w-12"
            />
            <p className="mt-3 max-w-xs text-sm text-white/60">
              Comunidad de reventa de sneakers y streetwear en {siteConfig.city}.
              Consignación con verificación de autenticidad en cada par.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Catálogo
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li><Link href="/sneakers" className="hover:text-white">Sneakers</Link></li>
              <li><Link href="/streetwear" className="hover:text-white">Streetwear</Link></li>
              <li><Link href="/lanzamientos" className="hover:text-white">Lanzamientos</Link></li>
              <li><Link href="/encargos" className="hover:text-white">Encargos VIP</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Pitsneakers
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li><Link href="/verificacion" className="hover:text-white">Verificación</Link></li>
              <li><Link href="/contacto" className="hover:text-white">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Únete a la comunidad
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <a
                href={buildGeneralWhatsAppLink(
                  "Hola! Quiero unirme a la comunidad de Pitsneakers"
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-whatsapp px-4 py-2 text-xs font-semibold text-white hover:bg-whatsapp-dark"
              >
                WhatsApp
              </a>
              <a
                href={siteConfig.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/70 hover:text-white"
              >
                {siteConfig.instagramHandle} en Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.</p>
          <p>{siteConfig.stats.whatsappMembers} en WhatsApp · {siteConfig.stats.instagramFollowers} en Instagram</p>
        </div>
      </div>
    </footer>
  );
}
