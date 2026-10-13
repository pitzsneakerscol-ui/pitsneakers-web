import { getBidder, getPublishedAuction, listAuctionItems } from "@/lib/auction";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Estado en vivo de los pares (precio, pujas, cierre y si vas ganando). Solo para inscritos con pase. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!isDbConfigured()) return Response.json({ error: "no-disponible" }, { status: 503, headers });
  const bidder = await getBidder();
  if (!bidder) return Response.json({ error: "sin-sesion" }, { status: 401, headers });
  const auction = await getPublishedAuction();
  if (!auction) return Response.json({ now: Date.now(), items: [] }, { headers });
  const items = await listAuctionItems(auction.id, bidder.id);
  return Response.json(
    {
      now: Date.now(),
      items: items.map((i) => ({ id: i.id, currentBid: i.currentBid, bidCount: i.bidCount, endsAt: i.endsAt, leader: i.leader, isLeader: i.isLeader })),
    },
    { headers }
  );
}
