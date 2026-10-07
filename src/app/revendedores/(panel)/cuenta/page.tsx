import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "@/components/reseller/AccountForms";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const user = await requireUser();
  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Mi cuenta</h1>
        <p className="mt-2 text-sm text-muted">
          Tu inventario es privado: solo se ve con tu usuario y contraseña. Puedes descargar un
          respaldo desde la sección Inventario.
        </p>
      </header>
      <ProfileForm username={user.username} displayName={user.displayName} whatsapp={user.whatsapp} email={user.email} />
      <PasswordForm />
    </div>
  );
}
