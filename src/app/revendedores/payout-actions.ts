"use server";

import { revalidatePath } from "next/cache";
import { rateLimitHit, requireUser } from "@/lib/auth";
import { savePayoutInfo } from "@/lib/seller-payout";
import { validatePayout } from "@/lib/payout-shared";
import type { ActionState } from "@/lib/reseller-shared";

const text = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").slice(0, max);

/** El revendedor deja (o corrige) a dónde le consignamos lo que vendió. */
export async function savePayout(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimitHit(`pago-datos:${user.id}`, 15, 60 * 60 * 1000))) return { error: "Hiciste muchos cambios seguidos. Espera un rato." };
  const res = validatePayout({
    method: text(fd, "method", 20),
    bank: text(fd, "bank", 60),
    accountType: text(fd, "accountType", 20),
    accountNumber: text(fd, "accountNumber", 40),
    holder: text(fd, "holder", 120),
    document: text(fd, "document", 30),
  });
  if ("error" in res) return { error: res.error };
  await savePayoutInfo(user.id, res.data);
  revalidatePath("/revendedores", "layout");
  return { ok: true, message: "Datos de pago guardados. Los usamos para consignarte lo que vendas." };
}
