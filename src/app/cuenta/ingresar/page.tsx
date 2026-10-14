import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { getBuyer } from "@/lib/buyers";
import { isGoogleConfigured } from "@/lib/google-auth";
import { safeNext } from "@/lib/buyer-shared";
import AuthForm from "@/components/cuenta/AuthForm";

export const metadata: Metadata = {
  title: "Ingresar o crear cuenta",
  description: "Crea tu cuenta de Pitsneakers: haz ofertas, guarda tu lista de deseos y mira el valor de tu colección.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function IngresarPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; registro?: string }> }) {
  if (!isDbConfigured()) redirect("/");
  const { next: nextRaw = "", error, registro } = await searchParams;
  const next = safeNext(nextRaw);
  if (await getBuyer()) redirect(next);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Mi cuenta</p>
      <h1 className="mt-3 font-display text-4xl leading-[0.95] tracking-wide sm:text-6xl">
        TU COLECCIÓN, <span className="text-accent">TUS OFERTAS</span>
      </h1>
      <p className="mb-6 mt-3 text-sm text-muted">Guarda los pares que quieres, mira lo que vale tu colección y haz ofertas por los pares del catálogo.</p>
      {error === "google" && (
        <p role="alert" className="mb-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">No pudimos entrar con Google. Intenta de nuevo o usa tu correo y contraseña.</p>
      )}
      <AuthForm next={next} googleEnabled={isGoogleConfigured()} startOnLogin={registro !== "1"} />
      <p className="mt-5 text-center text-sm text-muted">
        ¿Vendes pares?{" "}
        <Link href="/revendedores/ingresar" className="font-semibold text-ink underline underline-offset-4 hover:text-accent">Entra como revendedor</Link>
      </p>
    </section>
  );
}
