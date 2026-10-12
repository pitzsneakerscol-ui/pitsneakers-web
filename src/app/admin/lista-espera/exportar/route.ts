import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { todayBogota } from "@/lib/reseller-shared";
import { listWaitlist, waitlistToCsv } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Solo el administrador puede descargar la lista.", { status: 401 });
  return new Response(waitlistToCsv(await listWaitlist()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lista-espera-pitsneakers-${todayBogota()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
