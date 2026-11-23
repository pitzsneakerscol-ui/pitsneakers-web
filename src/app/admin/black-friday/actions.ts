"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { listBfProposals, setBfStatus } from "@/lib/bf-prices";
import { createNotification } from "@/lib/notifications";

const done = () => {
  revalidatePath("/admin/black-friday");
  revalidatePath("/admin", "layout");
  revalidatePath("/revendedores/black-friday");
};

/** Avisa a cada vendedor (en su panel) cuántos de sus pares aprobó o rechazó el dueño. */
async function notify(byUser: Map<number, number>, status: "aprobado" | "rechazado", note: string) {
  for (const [userId, n] of byUser) {
    await createNotification(userId, {
      kind: "info",
      title: status === "aprobado" ? `Black Friday: aprobamos ${n === 1 ? "1 par" : `${n} pares`}` : `Black Friday: ${n === 1 ? "1 par no entra" : `${n} pares no entran`}`,
      body: status === "aprobado" ? "Ya van a salir con su precio de oferta cuando arranque la campaña." : note || "Mira el motivo en tu página de Black Friday y ajusta el precio si quieres.",
      href: "/revendedores/black-friday",
    });
  }
}

/** Aprueba o rechaza una propuesta (un par). Campos: sku, decision ("aprobado" | "rechazado"), note (motivo si se rechaza). */
export async function decideBf(fd: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(fd.get("sku") ?? "");
  const decision = fd.get("decision") === "rechazado" ? "rechazado" : "aprobado";
  const note = String(fd.get("note") ?? "").trim();
  const r = await setBfStatus([sku], decision, note);
  await notify(r.byUser, decision, note);
  done();
}

/** Aprueba de una vez todas las propuestas pendientes que cumplan un descuento mínimo (campo min, en %; 0 = todas). */
export async function approveAllPendingBf(fd: FormData): Promise<void> {
  await requireAdmin();
  const min = Math.max(0, Math.min(90, Number(fd.get("min")) || 0));
  const skus = (await listBfProposals()).filter((p) => p.status === "pendiente" && p.pct >= min).map((p) => p.sku);
  const r = await setBfStatus(skus, "aprobado");
  await notify(r.byUser, "aprobado", "");
  done();
}
