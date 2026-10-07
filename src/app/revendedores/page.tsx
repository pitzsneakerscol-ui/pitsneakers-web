import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import AuthForms from "@/components/reseller/AuthForms";

export const metadata: Metadata = {
  title: "Vende con nosotros — controla tu stock",
  description:
    "Crea tu cuenta gratis y lleva el control de tu inventario de sneakers: cuánto pagaste, talla, cuánto esperas cobrar y tu utilidad real.",
};

const FEATURES = [
  {
    title: "Costo, talla y precio",
    text: "Registra cuánto pagaste por cada par, su talla y cuánto esperas cobrar. La utilidad y el margen se calculan solos.",
  },
  {
    title: "Anclado al catálogo",
    text: "Busca el par en el catálogo de Pitsneakers y trae marca, foto y precio de referencia para fijar un buen precio.",
  },
  {
    title: "Ventas y ganancia real",
    text: "Marca un par como vendido con su precio, canal y gastos. Mira tu ganancia por mes y por par.",
  },
  {
    title: "Alertas de stock estancado",
    text: "Detecta los pares que llevan más de 60 días sin moverse y los que vas a vender por debajo de su costo.",
  },
  {
    title: "Lista lista para WhatsApp",
    text: "Copia en un clic tu lista de pares disponibles con talla y precio para tus estados y grupos.",
  },
  {
    title: "Importa y exporta",
    text: "Sube tu inventario desde Excel (CSV) y descarga un respaldo cuando quieras. Tus datos son tuyos.",
  },
];

export default async function RevendedoresPage() {
  const enabled = isDbConfigured();
  if (enabled) {
    const user = await getCurrentUser();
    if (user) redirect(user.isAdmin ? "/admin" : "/revendedores/panel");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Vende con nosotros
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-wide text-balance sm:text-7xl">
            TU STOCK, <span className="text-accent">BAJO CONTROL</span>.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
            Deja el cuaderno y las hojas sueltas. Crea tu usuario, sube tu
            inventario y sabe en todo momento cuánto invertiste, cuánto esperas
            ganar y cuánto llevas ganado.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-xl border border-line bg-paper-raised p-5">
                <h2 className="font-display text-xl tracking-wide">{f.title}</h2>
                <p className="mt-2 text-sm text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:sticky lg:top-24">
          {enabled ? (
            <AuthForms />
          ) : (
            <div className="rounded-2xl border border-line bg-paper-raised p-8 text-center">
              <p className="font-display text-3xl tracking-wide">MUY PRONTO</p>
              <p className="mt-3 text-sm text-muted">
                Estamos terminando de activar las cuentas para vender con nosotros. Vuelve
                en unos días o escríbenos por WhatsApp para que te avisemos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
