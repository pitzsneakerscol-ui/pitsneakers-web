import "server-only";
import { getDb } from "@/lib/db";
import { computeCatalogPlan } from "@/lib/catalog-sync";
import { loadMissingData, makeMissingZip } from "@/lib/missing-lists";
import { todayBogota } from "@/lib/reseller-shared";

/** ZIP con el stock de cada revendedor que todavía no se puede publicar (falta foto, modelo, precio o talla). */
export async function buildMissingZip(): Promise<Buffer> {
  const db = await getDb();
  const plan = await computeCatalogPlan(Date.now());
  const data = await loadMissingData(db, plan.pending.map((p) => ({ itemId: p.itemId, reason: p.reason })));
  return makeMissingZip(data, todayBogota());
}
