"use server";

import { revalidatePath } from "next/cache";
import { unsubscribeByToken } from "@/lib/campaigns";

/** Público: quien recibió el correo confirma que no quiere más. El código secreto del enlace es la única llave. */
export async function unsubscribeAction(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "").slice(0, 60);
  await unsubscribeByToken(token);
  revalidatePath(`/baja/${token}`);
}
