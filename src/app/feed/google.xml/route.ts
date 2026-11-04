import { getAllGroups } from "@/lib/products";
import { googleFeedXml } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Feed de productos para Google Merchant Center (Shopping y listados gratuitos).
 * En Merchant Center: Productos → Fuentes de datos → Agregar → Archivo programado → esta dirección.
 * Siempre refleja el catálogo actual: precios del admin, pares ocultos y tallas.
 */
export async function GET() {
  const { xml } = googleFeedXml(await getAllGroups());
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Google lo descarga una o pocas veces al día; unos minutos de caché alivian la base de datos.
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
