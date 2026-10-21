import { getCurrentUser } from "@/lib/auth";
import { getReseller } from "@/lib/admin";
import { isDbConfigured } from "@/lib/db";
import { itemsToCsv, listItems } from "@/lib/reseller";
import { todayBogota } from "@/lib/reseller-shared";

export const dynamic = "force-dynamic";

/** Inventario completo de un vendedor en CSV (solo el dueño). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Solo el administrador puede descargar este inventario.", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("No encontrado", { status: 404 });
  const seller = await getReseller(id);
  if (!seller) return new Response("No encontrado", { status: 404 });

  const csv = itemsToCsv(await listItems(id));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventario-${seller.username}-${todayBogota()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
