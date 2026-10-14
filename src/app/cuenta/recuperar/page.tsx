import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { ForgotForm } from "@/components/cuenta/RecoveryForms";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function RecuperarPage() {
  if (!isDbConfigured()) redirect("/");
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-10 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Mi cuenta</p>
      <h1 className="mt-3 font-display text-4xl leading-[0.95] tracking-wide sm:text-5xl">¿OLVIDASTE TU <span className="text-accent">CONTRASEÑA</span>?</h1>
      <p className="mb-6 mt-3 text-sm text-muted">Escribe tu correo y te enviamos un enlace para crear una nueva.</p>
      <ForgotForm />
    </section>
  );
}
