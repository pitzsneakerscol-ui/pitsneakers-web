import "server-only";
import { cache } from "react";
import type { Client } from "@libsql/client";
import { getDb, getReadDb } from "@/lib/db";
import type { Product } from "@/types/product";

/**
 * Lo que "Actualizar catálogo" dejó guardado: pares del stock de los revendedores que se suman al catálogo del archivo
 * y SKU del archivo que se ocultan. Si la base no responde, el catálogo sigue funcionando solo con el archivo.
 */
export interface LiveOverlay {
  live: Product[];
  hidden: Set<string>;
}

// El layout lee esto en cada página: se guarda en memoria unos segundos para no ir a la base remota en cada visita.
const TTL_MS = 60_000;
const memo = globalThis as unknown as { __liveOverlay?: { at: number; value: LiveOverlay; pending?: Promise<LiveOverlay> } };

async function query(db: Client): Promise<LiveOverlay> {
  const [live, hidden] = await Promise.all([
    db.execute("SELECT payload FROM live_listings ORDER BY updated_at DESC, id"),
    db.execute("SELECT sku FROM catalog_hidden"),
  ]);
  return {
    live: live.rows.map((r) => JSON.parse(String(r.payload)) as Product),
    hidden: new Set(hidden.rows.map((r) => String(r.sku))),
  };
}

async function fetchOverlay(): Promise<LiveOverlay> {
  try {
    return await query(getReadDb());
  } catch {
    // Base nueva o sin tablas todavía: se prepara el esquema una vez y se reintenta.
    return query(await getDb());
  }
}

/** Descarta lo guardado en memoria (lo llama la actualización del catálogo para que se vea al instante). */
export function resetLiveOverlay(): void {
  memo.__liveOverlay = undefined;
}

export const loadLiveOverlay = cache(async (): Promise<LiveOverlay> => {
  const hit = memo.__liveOverlay;
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  if (hit?.pending) return hit.pending;

  const pending = fetchOverlay()
    .then((value) => {
      memo.__liveOverlay = { at: Date.now(), value };
      return value;
    })
    .catch((e) => {
      console.error("[catalogo] no se pudo leer el catálogo en vivo:", e);
      // Si había una lectura anterior, se sigue mostrando esa en vez de vaciar el catálogo.
      if (hit) return hit.value;
      return { live: [], hidden: new Set<string>() };
    });
  memo.__liveOverlay = { at: hit?.at ?? 0, value: hit?.value ?? { live: [], hidden: new Set() }, pending };
  return pending;
});
