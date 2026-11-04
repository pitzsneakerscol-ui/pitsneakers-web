import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { contactsToResendCsv } from "@/lib/contacts";
import { todayBogota } from "@/lib/reseller-shared";

export const dynamic = "force-dynamic";

/** CSV listo para Resend (Audiences → Add contacts → Import CSV). Sin los contactos dados de baja. */
export async function GET() {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Solo el administrador puede descargar los contactos.", { status: 401 });
  const { csv } = await contactsToResendCsv();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contactos-resend-pitsneakers-${todayBogota()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
