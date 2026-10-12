import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { findResetToken } from "@/lib/password-reset";
import { ResetForm } from "@/components/reseller/RecoveryForms";

export const metadata: Metadata = {
  title: "Nueva contraseña — revendedores",
  robots: { index: false, follow: false },
  // El enlace lleva un código secreto: que no viaje como referencia a otros sitios.
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function RestablecerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (!isDbConfigured()) redirect("/revendedores");
  const { token = "" } = await searchParams;
  const found = await findResetToken(token);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Revendedores</p>
      {found ? (
        <>
          <h1 className="mt-3 font-display text-4xl leading-[0.95] tracking-wide sm:text-6xl">
            CREA TU <span className="text-accent">NUEVA CONTRASEÑA</span>
          </h1>
          <p className="mb-6 mt-3 text-sm text-muted">Elige una que no uses en otros sitios. Al guardarla entras directo a tu panel.</p>
          <ResetForm token={token} username={found.username} />
        </>
      ) : (
        <>
          <h1 className="mt-3 font-display text-4xl leading-[0.95] tracking-wide sm:text-6xl">
            ESTE ENLACE <span className="text-accent">YA NO SIRVE</span>
          </h1>
          <p className="mb-6 mt-3 text-sm text-muted">Los enlaces valen 1 hora y se usan una sola vez. Pide uno nuevo y te lo enviamos otra vez.</p>
          <Link href="/revendedores/recuperar" className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:brightness-110">
            Pedir un enlace nuevo
          </Link>
        </>
      )}
    </section>
  );
}
