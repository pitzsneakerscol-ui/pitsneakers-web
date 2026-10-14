import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { findToken, markVerified } from "@/lib/buyers";

export const metadata: Metadata = { title: "Confirmar correo", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** El enlace del correo de confirmación. No se "gasta": si un filtro de correo lo abre antes que la persona, sigue sirviendo hasta que venza. */
export default async function VerificarPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (!isDbConfigured()) redirect("/");
  const { token = "" } = await searchParams;
  const buyer = await findToken(token, "verify");
  if (buyer) await markVerified(buyer.id);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-10 text-center sm:py-16">
      {buyer ? (
        <>
          <p className="text-5xl" aria-hidden="true">✅</p>
          <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">¡CORREO CONFIRMADO!</h1>
          <p className="mt-3 text-sm text-muted">Ya puedes hacer ofertas y ver tus compras anteriores en tu colección.</p>
          <Link href="/cuenta" className="btn-pop mx-auto mt-6 inline-flex items-center justify-center rounded-full bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-wide text-white">Ir a mi cuenta</Link>
        </>
      ) : (
        <>
          <p className="text-5xl" aria-hidden="true">⚠️</p>
          <h1 className="mt-3 font-display text-4xl tracking-wide">ENLACE NO VÁLIDO</h1>
          <p className="mt-3 text-sm text-muted">Venció o no es correcto. Entra a tu cuenta y pide que te lo reenviemos.</p>
          <Link href="/cuenta" className="mx-auto mt-6 inline-block text-sm font-semibold underline underline-offset-4 hover:text-accent">Ir a mi cuenta</Link>
        </>
      )}
    </section>
  );
}
