import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
import { pendingQuestionCount } from "@/lib/market";

// Todo el panel depende de la sesión y de la base de datos: nunca se prerenderiza.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isDbConfigured()) redirect("/revendedores");
  await requireAdmin();
  const pending = await pendingQuestionCount();
  return <AdminShell pending={pending}>{children}</AdminShell>;
}
