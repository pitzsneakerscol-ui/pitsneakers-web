"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { applyCatalogPlan, computeCatalogPlan } from "@/lib/catalog-sync";

/** Deja la web igual al stock de los revendedores: publica los pares nuevos y oculta los que ya no tienen. */
export async function refreshCatalog(): Promise<void> {
  await requireAdmin();
  const now = Date.now();
  const plan = await computeCatalogPlan(now);
  await applyCatalogPlan(plan, now);
  // Todas las páginas del catálogo se vuelven a armar con el stock nuevo.
  revalidatePath("/", "layout");
  redirect(`/admin/catalogo?listo=${plan.live.length}-${plan.hidden.length}-${plan.pending.length}`);
}
