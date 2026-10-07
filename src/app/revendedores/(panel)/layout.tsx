import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ResellerNav from "@/components/reseller/ResellerNav";

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
  return (
    <>
      <ResellerNav name={user.displayName || user.username} isAdmin={user.isAdmin} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </div>
    </>
  );
}
