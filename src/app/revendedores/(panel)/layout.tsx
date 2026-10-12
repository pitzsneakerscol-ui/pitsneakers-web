import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ResellerShell from "@/components/reseller/ResellerShell";
import { unreadCount } from "@/lib/notifications";
import { pendingOfferCount } from "@/lib/offers";
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
  const [unread, offers] = user.isAdmin ? [0, 0] : await Promise.all([unreadCount(user.id), pendingOfferCount(user.id)]);
  return (
    <ResellerShell name={user.displayName || user.username} isAdmin={user.isAdmin} unread={unread} offers={offers}>
      {children}
    </ResellerShell>
  );
}
