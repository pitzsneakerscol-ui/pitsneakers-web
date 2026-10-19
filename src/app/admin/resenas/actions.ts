"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteReview, setReviewStatus } from "@/lib/reviews";

/** Aprueba (se publica), rechaza (se oculta) o borra una reseña. */
export async function moderateReview(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const action = String(fd.get("action") ?? "");
  if (!Number.isInteger(id) || id <= 0) return;

  if (action === "aprobar") await setReviewStatus(id, "approved");
  else if (action === "rechazar") await setReviewStatus(id, "rejected");
  else if (action === "pendiente") await setReviewStatus(id, "pending");
  else if (action === "borrar") await deleteReview(id);
  else return;

  revalidatePath("/admin/resenas");
  revalidatePath("/");
  revalidatePath("/verificacion");
}
