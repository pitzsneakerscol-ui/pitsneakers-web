import { isDbConfigured } from "@/lib/db";
import { isWompiConfigured, isWompiTest, keyKinds } from "@/lib/wompi";

export const dynamic = "force-dynamic";

/** ¿Está activo el pago en línea? Se consulta al abrir cada par, así las páginas ya construidas lo ven sin volver a desplegar. */
export async function GET() {
  return Response.json(
    { enabled: isDbConfigured() && isWompiConfigured(), test: isWompiTest(), claves: keyKinds() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
