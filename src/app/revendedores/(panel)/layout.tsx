import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ResellerNav from "@/components/reseller/ResellerNav";
import { ensureSynced } from "@/lib/seller-sync";

export const metadata: Metadata = {
  title: "Mi panel de revendedor",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDbConfigured()) redirect("/revendedores");
  const user = await requireUser();
  // Pares del catálogo asignados a este usuario (columna VENDEDOR): se cargan solos al entrar.
  if (!user.isAdmin) await ensureSynced(user.id, user.username);
  return (
    <>
      <ResellerNav name={user.displayName || user.username} isAdmin={user.isAdmin} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </div>
    </>
  );
}
