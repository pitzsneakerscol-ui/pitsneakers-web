import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import { getGroupsByCategory } from "@/lib/products";
import { groupPriceRange } from "@/lib/grouping";
import CommunityStats from "@/components/CommunityStats";
import Reveal from "@/components/Reveal";
import OdometerStat from "@/components/orders/OdometerStat";
import SearchRadar, { type RadarPair } from "@/components/orders/SearchRadar";
import OrderTracker, { type TrackerStep } from "@/components/orders/OrderTracker";
import OrderTicket from "@/components/orders/OrderTicket";
import Faq, { type FaqItem } from "@/components/contact/Faq";

export const metadata: Metadata = {
  title: "Encargos VIP",
  description:
    "¿No encuentras el par que buscas en el catálogo? Pídelo con nuestro servicio de Encargos VIP y activamos toda la comunidad para conseguirlo.",
};

const steps: TrackerStep[] = [
  {
    number: "01",
    icon: "📝",
    title: "Nos cuentas qué buscas",
    description:
      "Modelo, colorway, talla y el precio que estás dispuesto a pagar. Entre más detalle nos des, más rápido lo encontramos.",
  },
  {
    number: "02",
    icon: "📡",
    title: "Activamos la red VIP",
    description: `Movemos tu encargo entre nuestros vendedores de confianza y los ${siteConfig.stats.whatsappGroups} grupos de la comunidad antes de que salga público.`,
  },
  {
    number: "03",
    icon: "📸",
    title: "Te avisamos apenas aparece",
    description:
      "En cuanto encontramos un candidato, te mandamos fotos reales por WhatsApp para que apruebes antes de seguir.",
  },
  {
    number: "04",
    icon: "✅",
    title: "Verificación y consignación segura",
    description: "El par pasa por el mismo proceso de autenticación de siempre antes de llegar a tus manos.",
  },
];

const reasons = [
  { icon: "🚪", title: "Acceso prioritario", text: "A pares que ni siquiera llegan a publicarse en el catálogo.", color: "#ff5a3c" },
  { icon: "📏", title: "Tu talla exacta", text: "No dependes de encontrarla ya publicada.", color: "#ffd23f" },
  { icon: "🛡️", title: "Verificado igual", text: "Mismo proceso de verificación y consignación segura de siempre.", color: "#3ddc84" },
  { icon: "💬", title: "Trato directo", text: "Comunicación por WhatsApp, sin formularios ni intermediarios.", color: "#25d366" },
];

const faqs: FaqItem[] = [
  {
    q: "¿Qué puedo pedir por encargo?",
    a: "Cualquier par o prenda que no encuentres en el catálogo: lanzamientos, colaboraciones, ediciones limitadas o tu talla exacta de un modelo que sí vemos publicado.",
  },
  {
    q: "¿Cuánto tarda en aparecer mi par?",
    a: "Depende de qué tan difícil sea el modelo y la talla. Apenas aparece un candidato te escribimos con fotos reales; tú decides si seguimos.",
  },
  {
    q: "¿Qué pasa cuando lo encuentran?",
    a: "Te enviamos fotos reales por WhatsApp. Si lo apruebas, el par pasa por la verificación de siempre antes de llegar a tus manos.",
  },
  {
    q: "¿Cuáles son las condiciones del encargo?",
    a: "Las coordinamos contigo por WhatsApp, según el par que busques. Escríbenos con el modelo, la talla y tu presupuesto y te contamos.",
  },
  {
    q: "¿Y si prefiero ver lo que ya hay?",
    a: (
      <>
        Mira el{" "}
        <Link href="/sneakers" className="font-semibold text-ink underline underline-offset-4">catálogo de sneakers</Link>{" "}
        o los{" "}
        <Link href="/lanzamientos" className="font-semibold text-ink underline underline-offset-4">lanzamientos</Link>.
      </>
    ),
  },
];

export default async function EncargosPage() {
  // Pares codiciados reales, de marcas distintas, para la demostración del radar.
  const ranked = (await getGroupsByCategory("sneakers"))
    .filter((g) => g.images.length > 0)
    .sort((a, b) => groupPriceRange(b).max - groupPriceRange(a).max);
  const seen = new Set<string>();
  const radarPairs: RadarPair[] = [];
  for (const g of ranked) {
    if (seen.has(g.brand)) continue;
    seen.add(g.brand);
    const cheapest = [...g.variants].sort((x, y) => x.price - y.price)[0];
    radarPairs.push({ name: `${g.brand === "Jordan" ? "" : `${g.brand} `}${g.name}`.trim(), size: cheapest.sizes[0] ?? "9", image: g.images[0] });
    if (radarPairs.length === 3) break;
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-ink py-14 text-white sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="glow-pulse pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-accent/30 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8">
          <div>
            <p className="fade-up text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Servicio VIP</p>
            <h1 className="mt-4 font-display text-4xl leading-[0.98] tracking-wide text-balance sm:text-6xl">
              {["¿NO", "LO", "ENCUENTRAS?"].map((w, i) => (
                <span key={w}>
                  <span className="hero-word" style={{ ["--i" as string]: i }}>{w}</span>{" "}
                </span>
              ))}
              <span className="hero-word hero-underline text-accent" style={{ ["--i" as string]: 3 }}>LO CONSEGUIMOS</span>
            </h1>
            <p className="fade-up mt-5 max-w-xl text-sm text-white/70 sm:text-base" style={{ ["--delay" as string]: "600ms" }}>
              Si el par que buscas no está en el catálogo, pídelo por encargo. Activamos nuestra red de vendedores y la
              comunidad de {siteConfig.stats.whatsappMembers} miembros para conseguirlo antes que nadie.
            </p>
            <div className="fade-up mt-7 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ ["--delay" as string]: "800ms" }}>
              <a
                href={buildGeneralWhatsAppLink("Hola! Quiero hacer un encargo VIP. Estoy buscando: ")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pop btn-shine wa-pulse relative inline-flex items-center justify-center rounded-full bg-whatsapp px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-whatsapp-dark"
              >
                Solicitar mi par
              </a>
              <a href="#arma-tu-encargo" className="text-xs font-semibold uppercase tracking-widest text-white/70 underline underline-offset-4 hover:text-white">
                O arma tu encargo ↓
              </a>
            </div>
            <div className="mt-8 flex gap-8">
              <OdometerStat value={siteConfig.stats.whatsappMembers} label="Miembros buscando" />
              <OdometerStat value={String(siteConfig.stats.whatsappGroups)} label="Grupos activos" />
            </div>
          </div>
          <SearchRadar pairs={radarPairs} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Cómo funciona</p>
          <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
            De tu pedido <span className="text-accent">a tu puerta</span>
          </h2>
        </Reveal>
        <div className="mt-10">
          <OrderTracker steps={steps} />
        </div>
      </section>

      <section id="arma-tu-encargo" className="scroll-mt-20 bg-paper-raised/60 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Hazlo ahora</p>
            <h2 className="mt-3 font-display text-3xl leading-[1] tracking-wide text-balance sm:text-5xl">
              Arma tu encargo <span className="text-accent">en un minuto</span>
            </h2>
            <p className="mt-3 text-sm text-muted sm:text-base">
              Cuéntanos qué buscas y mira cómo se llena tu ticket. Al enviarlo, WhatsApp se abre con todo escrito.
            </p>
          </Reveal>
          <Reveal className="mt-10" delay={100}>
            <OrderTicket />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <h2 className="font-display text-3xl tracking-wide sm:text-4xl">
            ¿Por qué pedir <span className="text-accent">un encargo?</span>
          </h2>
        </Reveal>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r, i) => (
            <li key={r.title}>
              <Reveal delay={i * 90} className="h-full">
                <div className="rl-card group relative h-full overflow-hidden rounded-xl border border-line bg-paper-raised p-5" style={{ ["--c" as string]: r.color }}>
                  <span aria-hidden="true" className="rl-icon inline-flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: `${r.color}26` }}>
                    {r.icon}
                  </span>
                  <h3 className="mt-3 text-base font-semibold">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted">{r.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Dudas frecuentes</p>
          <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">Antes de pedir</h2>
        </Reveal>
        <Reveal className="mt-8" delay={80}>
          <Faq items={faqs} />
        </Reveal>
      </section>

      <CommunityStats />
    </div>
  );
}
