import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

// Todo el panel depende de la sesión y de la base de datos: nunca se prerenderiza.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isDbConfigured()) redirect("/revendedores");
  await requireAdmin();
  return (
    <>
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">{children}</div>
    </>
  );
}
