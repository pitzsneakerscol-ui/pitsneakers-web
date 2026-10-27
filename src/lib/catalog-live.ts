import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import type { Product } from "@/types/product";

/**
 * Lo que "Actualizar catálogo" dejó guardado: pares del stock de los revendedores que se suman al catálogo del archivo
 * y SKU del archivo que se ocultan. Si la base no responde, el catálogo sigue funcionando solo con el archivo.
 */
export interface LiveOverlay {
  live: Product[];
  hidden: Set<string>;
}

export const loadLiveOverlay = cache(async (): Promise<LiveOverlay> => {
  try {
    const db = await getDb();
    const [live, hidden] = await Promise.all([
      db.execute("SELECT payload FROM live_listings ORDER BY updated_at DESC, id"),
      db.execute("SELECT sku FROM catalog_hidden"),
    ]);
    return {
      live: live.rows.map((r) => JSON.parse(String(r.payload)) as Product),
      hidden: new Set(hidden.rows.map((r) => String(r.sku))),
    };
  } catch (e) {
    console.error("[catalogo] no se pudo leer el catálogo en vivo:", e);
    return { live: [], hidden: new Set() };
  }
});
