import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { buildMissingZip } from "@/lib/missing-stock";
import { todayBogota } from "@/lib/reseller-shared";

export const dynamic = "force-dynamic";

/** ZIP con las listas de lo que falta subir de todos los revendedores (solo el dueño). */
export async function GET() {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Solo el administrador puede descargar estas listas.", { status: 401 });

  const zip = await buildMissingZip();
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="stock-faltante-${todayBogota()}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
