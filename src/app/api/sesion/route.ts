import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { getBuyer } from "@/lib/buyers";

export const dynamic = "force-dynamic";

/** Dice si hay un vendedor (o el dueño) con sesión abierta, para que la barra superior muestre "Mi panel" en vez de "Ingresar". */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!isDbConfigured()) return Response.json({ in: false }, { headers });
  const user = await getCurrentUser();
  if (!user) {
    const buyer = await getBuyer();
    return Response.json(buyer ? { in: false, buyer: { name: buyer.name || buyer.email } } : { in: false }, { headers });
  }
  return Response.json({ in: true, name: user.displayName || user.username, admin: user.isAdmin }, { headers });
}
