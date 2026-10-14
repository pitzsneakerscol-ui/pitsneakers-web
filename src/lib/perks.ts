import "server-only";
import { buildCollection } from "@/lib/collection";
import { LEAGUES, PERKS, leagueFor, type League, type Perks } from "@/lib/leagues";
import type { Buyer } from "@/lib/buyers";

export interface BuyerPerks {
  /** liga que da los beneficios (solo compras verificadas en Pitsneakers) */
  league: League;
  perks: Perks;
}

const BASE: BuyerPerks = { league: LEAGUES[0], perks: PERKS.bronce };

/**
 * Beneficios activos de un comprador. Cuentan solo los puntos de lo que compró en Pitsneakers:
 * los pares agregados a mano no activan beneficios (algunos cuestan dinero y no podemos verificarlos).
 */
export async function getPerks(buyer: Buyer | null): Promise<BuyerPerks> {
  if (!buyer || !buyer.verified) return BASE;
  const col = await buildCollection(buyer);
  const league = leagueFor(col.verifiedPoints).current;
  return { league, perks: PERKS[league.key] };
}
