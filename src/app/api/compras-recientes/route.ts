import { listRecentPurchases } from "@/lib/recent-purchases";

export const dynamic = "force-dynamic";

/** Últimas compras reales (solo nombre de pila, par y fecha) para el menú. Se guarda unos minutos en el CDN para no consultar la base en cada visita. */
export async function GET() {
  try {
    const items = await listRecentPurchases(6);
    return Response.json({ items }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch {
    return Response.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
