import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import Reveal from "@/components/Reveal";
import MessageBuilder from "@/components/contact/MessageBuilder";
import Faq, { type FaqItem } from "@/components/contact/Faq";

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
    color: "#25d366",
    style: "bg-whatsapp text-white hover:bg-whatsapp-dark",
    badge: "Más rápido",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden="true">
        <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.986.579 3.836 1.579 5.397L2 22l4.735-1.55A9.953 9.953 0 0 0 12.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.2a8.16 8.16 0 0 1-4.256-1.185l-.305-.181-3.045.997.996-2.968-.199-.31A8.163 8.163 0 0 1 3.8 12c0-4.522 3.679-8.2 8.201-8.2 4.521 0 8.199 3.678 8.199 8.2 0 4.522-3.678 8.2-8.199 8.2zm4.5-6.1c-.247-.124-1.462-.722-1.688-.804-.227-.083-.392-.124-.557.124-.165.247-.64.804-.784.969-.144.165-.288.186-.536.062-.247-.124-1.044-.385-1.99-1.228-.735-.656-1.232-1.466-1.376-1.713-.144-.247-.015-.381.109-.504.111-.111.247-.289.371-.433.124-.145.165-.248.247-.413.083-.165.041-.31-.02-.433-.062-.124-.557-1.34-.763-1.835-.2-.482-.404-.416-.557-.424l-.474-.008c-.165 0-.433.062-.66.31-.227.247-.866.846-.866 2.063 0 1.217.886 2.393 1.01 2.558.124.165 1.744 2.663 4.226 3.735.59.255 1.05.407 1.41.521.593.188 1.133.162 1.56.098.476-.071 1.462-.598 1.668-1.175.206-.578.206-1.073.144-1.176-.062-.103-.227-.165-.474-.289z" />
      </svg>
    ),
  },
  {
    title: "Comunidad de WhatsApp",
    description: `Únete a uno de nuestros ${siteConfig.stats.whatsappGroups} grupos y entérate primero de cada lanzamiento.`,
    action: "Unirme al grupo",
    href: siteConfig.whatsappCommunityUrl,
    color: "#ffd23f",
    style: "bg-ink text-white hover:bg-ink/90",
    badge: `${siteConfig.stats.whatsappMembers} miembros`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9.500" r="2.500" />
        <path d="M16 14.200c2.900-.4 5 1.600 5 4.800" />
      </svg>
    ),
  },
  {
    title: "Instagram",
    description: `Síguenos en ${siteConfig.instagramHandle} para ver drops, fotos reales y reseñas de la comunidad.`,
    action: "Ver Instagram",
    href: siteConfig.instagramUrl,
    color: "#ff6b9d",
    style: "border border-line text-ink hover:border-ink",
    badge: `${siteConfig.stats.instagramFollowers} seguidores`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-7 w-7" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.500" cy="6.500" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const faqs: FaqItem[] = [
  {
    q: "¿Cómo compro un par?",
    a: (
      <>
        Elige el par en el catálogo y toca <strong>Consultar por WhatsApp</strong>: el mensaje sale escrito con el
        producto y la talla. Cerramos la compra por chat, sin carrito ni formularios.
      </>
    ),
  },
  {
    q: "¿Cómo sé que es original?",
    a: (
      <>
        Cada par pasa por revisión física y autenticación antes de publicarse. Mira el proceso completo en{" "}
        <Link href="/verificacion" className="font-semibold text-ink underline underline-offset-4">Verificación</Link>.
      </>
    ),
  },
  {
    q: "¿Puedo vender mi par con ustedes?",
    a: (
      <>
        Sí. Lo recibimos, lo verificamos, lo publicamos y intermediamos la venta. Cobramos una comisión del{" "}
        {siteConfig.commission.percent}% (mínimo ${siteConfig.commission.minimum.toLocaleString("es-CO")} COP) y el
        vendedor recibe el resto una vez confirmada la entrega.
      </>
    ),
  },
  {
    q: "¿Qué es un encargo VIP?",
    a: (
      <>
        Si no encuentras el par que buscas, activamos nuestra red y la comunidad para conseguírtelo.{" "}
        <Link href="/encargos" className="font-semibold text-ink underline underline-offset-4">Conoce el servicio</Link>.
      </>
    ),
  },
  {
    q: "¿Tienen pago en línea?",
    a: "No manejamos carrito ni formularios: todo se negocia por chat, como lo hemos hecho siempre con la comunidad. Precio y condiciones los acuerdas directamente por WhatsApp.",
  },
  {
    q: "Revendo pares, ¿cómo llevo mi stock?",
    a: (
      <>
        Crea tu cuenta en{" "}
        <Link href="/revendedores" className="font-semibold text-ink underline underline-offset-4">Vende con nosotros</Link>{" "}
        y registra cuánto pagaste, la talla y cuánto esperas cobrar: el panel calcula tu ganancia real.
      </>
    ),
  },
];

export default function ContactoPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-ink py-14 text-white sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="glow-pulse pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-whatsapp/30 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="fade-up inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
            <span className="nav-dot" style={{ ["--glow" as string]: "#25d366" }} />
            Atendemos por chat
          </p>
          <h1 className="mt-5 font-display text-4xl leading-[0.98] tracking-wide text-balance sm:text-6xl">
            {["HABLEMOS", "POR"].map((w, i) => (
              <span key={w}>
                <span className="hero-word" style={{ ["--i" as string]: i }}>{w}</span>{" "}
              </span>
            ))}
            <span className="hero-word hero-underline text-whatsapp" style={{ ["--i" as string]: 2 }}>WHATSAPP</span>
          </h1>
          <p className="fade-up mt-5 max-w-xl text-sm text-white/70 sm:text-base" style={{ ["--delay" as string]: "600ms" }}>
            No manejamos formularios ni carrito de compras: todo se negocia por chat, como lo hemos hecho siempre con
            la comunidad. Elige el canal que prefieras.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <ul className="grid gap-4 sm:grid-cols-3">
          {channels.map((c, i) => (
            <li key={c.title}>
              <Reveal delay={i * 100} className="h-full">
                <div className="rl-card group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-line bg-paper-raised p-6" style={{ ["--c" as string]: c.color }}>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rl-icon flex h-14 w-14 items-center justify-center rounded-2xl text-ink" style={{ background: `${c.color}33` }}>
                        {c.icon}
                      </span>
                      <span className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{c.badge}</span>
                    </div>
                    <h2 className="mt-4 font-display text-2xl tracking-wide">{c.title}</h2>
                    <p className="mt-2 text-sm text-muted">{c.description}</p>
                  </div>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`btn-pop btn-shine relative mt-6 inline-flex items-center justify-center rounded-full px-5 py-3.5 text-xs font-semibold uppercase tracking-wide ${c.style}`}
                  >
                    {c.action}
                  </a>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-paper-raised/60 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Más rápido</p>
            <h2 className="mt-3 font-display text-3xl leading-[1] tracking-wide text-balance sm:text-5xl">
              Arma tu mensaje <span className="text-accent">en segundos</span>
            </h2>
            <p className="mt-3 text-sm text-muted sm:text-base">
              Elige qué necesitas y mira cómo queda tu mensaje. Al enviarlo, WhatsApp se abre con todo ya escrito.
            </p>
          </Reveal>
          <Reveal className="mt-8" delay={100}>
            <MessageBuilder />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Dudas frecuentes</p>
          <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">Antes de escribirnos</h2>
        </Reveal>
        <Reveal className="mt-8" delay={80}>
          <Faq items={faqs} />
        </Reveal>
        <p className="mt-8 text-xs text-muted">
          {siteConfig.city} · Respondemos por WhatsApp en horario habitual de la comunidad.
        </p>
      </section>
    </div>
  );
}
