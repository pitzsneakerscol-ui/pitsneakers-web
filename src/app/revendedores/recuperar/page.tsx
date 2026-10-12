import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { ForgotForm } from "@/components/reseller/RecoveryForms";

export const metadata: Metadata = {
  title: "Recuperar contraseña — revendedores",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function RecuperarPage() {
  if (!isDbConfigured()) redirect("/revendedores");
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/revendedores/panel");

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Revendedores</p>
      <h1 className="mt-3 font-display text-4xl leading-[0.95] tracking-wide sm:text-6xl">
        ¿OLVIDASTE TU <span className="text-accent">CONTRASEÑA</span>?
      </h1>
      <p className="mb-6 mt-3 text-sm text-muted">
        Escribe el correo con el que te registraron y te enviamos un enlace para crear una nueva. Si no tienes un correo registrado,
        escríbenos por WhatsApp.
      </p>
      <ForgotForm />
      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/revendedores/ingresar" className="font-semibold text-ink underline underline-offset-4 hover:text-accent">
          Volver a iniciar sesión
        </Link>
      </p>
    </section>
  );
}
