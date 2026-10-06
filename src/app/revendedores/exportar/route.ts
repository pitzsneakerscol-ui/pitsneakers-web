import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { itemsToCsv, listItems } from "@/lib/reseller";
import { todayBogota } from "@/lib/reseller-shared";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Inicia sesión para exportar.", { status: 401 });
  const csv = itemsToCsv(await listItems(user.id));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventario-pitsneakers-${todayBogota()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
