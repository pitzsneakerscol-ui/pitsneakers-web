import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import AuthForms from "@/components/reseller/AuthForms";
import Reveal from "@/components/Reveal";
import Rotator from "@/components/reseller-landing/Rotator";
import PanelDemo from "@/components/reseller-landing/PanelDemo";
import FeatureMarquee from "@/components/reseller-landing/FeatureMarquee";
import Features from "@/components/reseller-landing/Features";
import ProfitCalculator from "@/components/reseller-landing/ProfitCalculator";
import HowItWorks from "@/components/reseller-landing/HowItWorks";
import JoinBar from "@/components/reseller-landing/JoinBar";

export const metadata: Metadata = {
  title: "Vende con nosotros — controla tu stock",
  description:
    "Crea tu cuenta gratis y lleva el control de tu inventario de sneakers: cuánto pagaste, talla, cuánto esperas cobrar y tu utilidad real.",
};

function Heading({ eyebrow, title, accent }: { eyebrow: string; title: string; accent: string }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl leading-[1] tracking-wide text-balance sm:text-5xl">
        {title} <span className="text-accent">{accent}</span>
      </h2>
    </Reveal>
  );
}

export default async function RevendedoresPage() {
  const enabled = isDbConfigured();
  if (enabled) {
    const user = await getCurrentUser();
    if (user) redirect(user.isAdmin ? "/admin" : "/revendedores/panel");
  }

  return (
    <>
      {/* Portada: promesa + formulario */}
      <section className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Vende con nosotros</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-wide text-balance sm:text-7xl">
              TU STOCK, <span className="text-accent">BAJO CONTROL</span>.
            </h1>
            <div className="mt-5 font-display text-2xl tracking-wide text-ink/80 sm:text-3xl">
              <Rotator
                phrases={[
                  "Sabes cuánto pagaste.",
                  "Sabes cuánto ganas.",
                  "Sabes qué vender primero.",
                  "Sabes qué se estancó.",
                ]}
              />
            </div>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
              Deja el cuaderno y las hojas sueltas. Crea tu usuario, sube tu inventario y mira en todo momento
              cuánto invertiste, cuánto esperas ganar y cuánto llevas ganado.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
              {["Gratis", "Sin tarjeta", "Tus datos son tuyos"].map((t) => (
                <li key={t} className="rounded-full border border-line bg-paper-raised px-4 py-2">
                  ✓ {t}
                </li>
              ))}
            </ul>
          </div>

          <div id="registro" className="scroll-mt-24 lg:sticky lg:top-24">
            {enabled ? (
              <AuthForms />
            ) : (
              <div className="rounded-2xl border border-line bg-paper-raised p-8 text-center">
                <p className="font-display text-3xl tracking-wide">MUY PRONTO</p>
                <p className="mt-3 text-sm text-muted">
                  Estamos terminando de activar las cuentas para vender con nosotros. Vuelve en unos días o
                  escríbenos por WhatsApp para que te avisemos.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <FeatureMarquee />

      {/* Panel en vivo */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <Heading eyebrow="Tu panel" title="Mira entrar cada venta" accent="en vivo." />
            <Reveal delay={120}>
              <p className="mt-5 max-w-md text-base text-muted">
                Cada par que vendes suma a tu ganancia, mueve tus gráficas y sale de tu inventario. Así se ve tu
                negocio, siempre al día.
              </p>
            </Reveal>
          </div>
          <PanelDemo />
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-paper-raised/60 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Heading eyebrow="Qué incluye" title="Todo lo que necesitas" accent="para vender mejor." />
          <div className="mt-10">
            <Features />
          </div>
        </div>
      </section>

      {/* Calculadora */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Heading eyebrow="Pruébalo" title="Calcula cuánto" accent="puedes ganar." />
        <Reveal className="mt-10" delay={80}>
          <ProfitCalculator />
        </Reveal>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Heading eyebrow="Cómo funciona" title="Empieza en" accent="tres pasos." />
        <div className="mt-10">
          <HowItWorks />
        </div>
        <Reveal className="mt-12 text-center" delay={100}>
          <a
            href="#registro"
            className="btn-pop btn-shine rs-ring relative inline-flex items-center justify-center rounded-full bg-accent px-10 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:brightness-110"
          >
            Crear mi cuenta gratis
          </a>
        </Reveal>
      </section>

      {enabled && <JoinBar />}
    </>
  );
}
