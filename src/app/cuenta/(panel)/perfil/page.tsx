import { redirect } from "next/navigation";
import { getBuyer } from "@/lib/buyers";
import { cardCls } from "@/components/reseller/ui";
import { PasswordForm, ProfileForm } from "@/components/cuenta/CuentaForms";

export default async function PerfilPage() {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Mis datos</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          {buyer.email} · {buyer.verified ? "correo confirmado ✓" : "correo sin confirmar"}{buyer.google ? " · conectado con Google" : ""}
        </p>
        <ProfileForm name={buyer.name} phone={buyer.phone} city={buyer.city} />
      </section>
      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="font-display text-2xl tracking-wide">Contraseña</h2>
        <div className="mt-4">
          <PasswordForm hasPassword={buyer.hasPassword} />
        </div>
      </section>
    </div>
  );
}
