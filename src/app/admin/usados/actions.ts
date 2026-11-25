"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { reviewUsedItem } from "@/lib/used-pairs";

/** El dueño aprueba o rechaza un par usado según sus fotos. Al rechazar, el motivo le llega al vendedor para que lo corrija. */
export async function reviewUsed(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const decision = fd.get("decision") === "aprobado" ? "aprobado" : fd.get("decision") === "rechazado" ? "rechazado" : null;
  const note = String(fd.get("note") ?? "").trim().slice(0, 300);
  if (!Number.isInteger(id) || id <= 0 || !decision) redirect("/admin/usados?error=datos");
  if (decision === "rechazado" && !note) redirect("/admin/usados?error=nota");

  const item = await reviewUsedItem(id, decision, note);
  if (!item) redirect("/admin/usados?error=revisado");

  const label = `${item.name}${item.size ? ` · talla ${item.size}` : ""}`;
  await createNotification(item.userId, {
    kind: "inventario",
    title: decision === "aprobado" ? "Aprobamos tu par usado" : "Tu par usado no fue aprobado",
    body: decision === "aprobado" ? `${label}: las fotos están bien. Lo publicamos en la web en cuanto actualicemos el catálogo.` : `${label}: ${note}`,
    href: "/revendedores/inventario",
  });
  revalidatePath("/admin/usados");
  revalidatePath("/revendedores/inventario");
  redirect(`/admin/usados?listo=${decision}`);
}
