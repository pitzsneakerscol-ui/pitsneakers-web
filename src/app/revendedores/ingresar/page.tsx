import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import AuthForms from "@/components/reseller/AuthForms";

export const metadata: Metadata = {
  title: "Ingresar — revendedores",
  description: "Entra a tu panel de revendedor de Pitsneakers: inventario, ventas y utilidad.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

/** Entrada rápida para vendedores que ya tienen cuenta: solo el formulario, sin la página de presentación. */
export default async function IngresarPage() {
  if (!isDbConfigured()) redirect("/revendedores");
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/revendedores/panel");

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Revendedores</p>
      <h1 className="mt-3 font-display text-4xl leading-[0.95] tracking-wide sm:text-6xl">
        BIENVENIDO <span className="text-accent">DE VUELTA</span>
      </h1>
      <p className="mb-6 mt-3 text-sm text-muted">Entra con tu usuario y contraseña para ver tu inventario y tus ventas.</p>
      <AuthForms startOnLogin />
      <p className="mt-5 text-center text-sm text-muted">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/revendedores" className="font-semibold text-ink underline underline-offset-4 hover:text-accent">
          Conoce cómo vender con nosotros
        </Link>
      </p>
    </section>
  );
}
