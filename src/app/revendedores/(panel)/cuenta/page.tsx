import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/reseller/AccountForms";
import PayoutForm from "@/components/reseller/PayoutForm";
import { getPayoutInfo } from "@/lib/seller-payout";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const user = await requireUser();
  const payout = user.isAdmin ? null : await getPayoutInfo(user.id);
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
      {user.isAdmin ? null : <PayoutForm initial={payout} />}
      <PasswordForm />
      <DeleteAccountForm />
    </div>
  );
}
