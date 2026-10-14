import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { findToken } from "@/lib/buyers";
import { ResetForm } from "@/components/cuenta/RecoveryForms";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RestablecerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (!isDbConfigured()) redirect("/");
  const { token = "" } = await searchParams;
  const buyer = await findToken(token, "reset");
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl leading-[0.95] tracking-wide sm:text-5xl">NUEVA <span className="text-accent">CONTRASEÑA</span></h1>
      <div className="mt-6">
        {buyer ? (
          <ResetForm token={token} email={buyer.email} />
        ) : (
          <div className="rounded-2xl border border-line bg-paper-raised p-6 text-center">
            <p className="text-sm text-muted">Este enlace ya no sirve (se usó o venció).</p>
            <Link href="/cuenta/recuperar" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4 hover:text-accent">Pedir uno nuevo</Link>
          </div>
        )}
      </div>
    </section>
  );
}
