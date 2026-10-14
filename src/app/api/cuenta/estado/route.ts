import { isDbConfigured } from "@/lib/db";
import { getBuyer } from "@/lib/buyers";

export const dynamic = "force-dynamic";

/** Dice si hay un comprador con sesión (la ficha del producto decide con esto si muestra "Hacer una oferta" o "Ingresar"). */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!isDbConfigured()) return Response.json({ in: false, enabled: false }, { headers });
  const b = await getBuyer();
  if (!b) return Response.json({ in: false, enabled: true }, { headers });
  return Response.json({ in: true, enabled: true, verified: b.verified, name: b.name }, { headers });
}
