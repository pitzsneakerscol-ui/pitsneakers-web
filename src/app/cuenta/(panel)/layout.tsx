import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { getBuyer } from "@/lib/buyers";
import { listBuyerOffers } from "@/lib/buyer-offers";
import { logout } from "../actions";
import CuentaTabs from "@/components/cuenta/CuentaTabs";
import { ResendVerification } from "@/components/cuenta/CuentaForms";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isDbConfigured()) redirect("/");
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  // Ofertas que esperan algo del comprador: una contraoferta por responder o una aceptada por pagar.
  const offers = await listBuyerOffers(buyer.id);
  const alerts = offers.filter((o) => o.status === "contraoferta" || o.status === "aceptada").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Mi cuenta</p>
          <h1 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">{buyer.name ? `HOLA, ${buyer.name.split(" ")[0].toUpperCase()}` : "MI CUENTA"}</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="text-xs font-semibold uppercase tracking-wide text-muted underline underline-offset-4 hover:text-accent">Cerrar sesión</button>
        </form>
      </div>

      {!buyer.verified && (
        <div className="mt-5 space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            <strong>Confirma tu correo.</strong> Te enviamos un enlace a {buyer.email}. Hasta que lo confirmes no puedes hacer ofertas y no vemos tus compras anteriores en tu colección.
          </p>
          <ResendVerification />
        </div>
      )}

      <div className="mt-6">
        <CuentaTabs alerts={alerts} />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
