import { getBidder } from "@/lib/auction";
import { isDbConfigured } from "@/lib/db";
import { getState } from "@/lib/trivia";

export const dynamic = "force-dynamic";

/** Estado de la trivia para el jugador con pase. El cliente lo pide solo en los cambios de fase (no en bucle). */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!isDbConfigured()) return Response.json({ error: "no-disponible" }, { status: 503, headers });
  const bidder = await getBidder();
  if (!bidder) return Response.json({ error: "sin-sesion" }, { status: 401, headers });
  return Response.json(await getState(bidder.id), { headers });
}
