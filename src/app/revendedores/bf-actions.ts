"use server";

import { requireUser } from "@/lib/auth";
import { saveBfPrices } from "@/lib/bf-prices";

export type BfState = { ok?: boolean; error?: string; message?: string } | undefined;

/** Guarda los precios de Black Friday que el revendedor puso a sus pares (campos bf_<SKU>; vacío = no participa). */
export async function saveBlackFridayPrices(_prev: BfState, fd: FormData): Promise<BfState> {
  const user = await requireUser();
  const wanted = new Map<string, number>();
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("bf_")) continue;
    const digits = String(v).replace(/\D/g, "");
    wanted.set(k.slice(3), digits ? Number(digits) : 0);
  }
  if (wanted.size === 0) return { error: "No hay pares para guardar." };
  try {
    const r = await saveBfPrices(user.id, user.username, wanted);
    if (!r.ok) return { error: r.error };
    const parts = [r.set > 0 ? `${r.set} ${r.set === 1 ? "par con precio" : "pares con precio"} de Black Friday` : "", r.cleared > 0 ? `${r.cleared} ${r.cleared === 1 ? "par quitado" : "pares quitados"}` : ""].filter(Boolean);
    return { ok: true, message: parts.length ? `Guardado: ${parts.join(" y ")}.` : "No hubo cambios." };
  } catch (e) {
    console.error("[black-friday] no se pudo guardar:", e);
    return { error: "No pudimos guardar los precios. Intenta de nuevo." };
  }
}
