import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import { getNewArrivalGroups } from "@/lib/products";
import CommunityStats from "@/components/CommunityStats";
import Testimonials from "@/components/Testimonials";
import Reveal from "@/components/Reveal";
import VerifyHero from "@/components/verify/VerifyHero";
import VerifyTimeline from "@/components/verify/VerifyTimeline";
import WhatWeCheck from "@/components/verify/WhatWeCheck";
import SealBadge from "@/components/verify/SealBadge";

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

const guarantees = [
  { icon: "🔍", title: "Autenticidad verificada", text: "Antes de que el producto se publique." },
  { icon: "🤝", title: "Pitsneakers en el medio", text: "Intermediamos toda la negociación y la entrega." },
  { icon: "👥", title: "Respaldo de la comunidad", text: `Más de ${siteConfig.stats.whatsappMembers} miembros activos compran y venden con nosotros.` },
  { icon: "💬", title: "Trato directo", text: "Negocias precio y condiciones por WhatsApp, como siempre." },
];

export default async function VerificacionPage() {
  // Un par real del catálogo para la demostración del escáner.
  const sample = (await getNewArrivalGroups()).find((g) => g.category === "sneakers" && g.images.length > 0);

  return (
    <div>
      <VerifyHero
        photo={sample?.images[0] ?? null}
        photoName={sample ? `${sample.brand} ${sample.name}` : "Tu par"}
        members={siteConfig.stats.whatsappMembers}
        city={siteConfig.city}
      />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Paso a paso</p>
          <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">Así verificamos cada producto</h2>
        </Reveal>
        <div className="mt-10">
          <VerifyTimeline steps={steps} />
        </div>
      </section>

      <section className="bg-paper-raised/60 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Con lupa</p>
            <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
              Qué revisamos <span className="text-accent">en cada par</span>
            </h2>
          </Reveal>
          <Reveal className="mt-10" delay={100}>
            <WhatWeCheck />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
          <Reveal className="mx-auto text-ink">
            <SealBadge size={190} />
          </Reveal>
          <div>
            <Reveal>
              <h2 className="font-display text-3xl tracking-wide sm:text-4xl">
                ¿Qué garantía te da esto <span className="text-accent">como comprador?</span>
              </h2>
            </Reveal>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {guarantees.map((g, i) => (
                <li key={g.title}>
                  <Reveal delay={i * 90} className="h-full">
                    <div className="rl-card group relative h-full overflow-hidden rounded-xl border border-line bg-paper-raised p-5" style={{ ["--c" as string]: "#3ddc84" }}>
                      <span aria-hidden="true" className="rl-icon inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-xl">
                        {g.icon}
                      </span>
                      <h3 className="mt-3 text-base font-semibold">{g.title}</h3>
                      <p className="mt-1 text-sm text-muted">{g.text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
            <Reveal delay={200}>
              <a
                href={buildGeneralWhatsAppLink("Hola! Tengo una pregunta sobre el proceso de verificación de Pitsneakers")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pop btn-shine relative mt-8 inline-flex items-center justify-center rounded-full bg-whatsapp px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-whatsapp-dark"
              >
                Tengo una pregunta
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      <Testimonials />
      <CommunityStats />
    </div>
  );
}
