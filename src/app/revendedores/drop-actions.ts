"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markSellerDropped } from "@/lib/catalog-orders";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { siteConfig } from "@/config/site";

/** El revendedor avisa desde su panel que ya dejó el par en el punto de verificación. Le llega un correo al equipo. */
export async function confirmDropOff(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const order = await markSellerDropped(id, user.id);
  revalidatePath("/revendedores/pedidos");
  if (!order || !isEmailConfigured()) return;
  const par = `${order.brand} ${order.productName}`.replace(/^(\S+) \1 /, "$1 ");
  await sendEmail({
    to: siteConfig.contactEmail,
    subject: `${user.displayName || user.username} dejó el par: ${par}`,
    body: [
      "# Un vendedor dice que ya dejó el par",
      "",
      `${user.displayName || user.username} avisó desde su panel que ya dejó **${par}**${order.size && order.size !== "Única" ? ` (talla ${order.size})` : ""} en el punto de verificación.`,
      "",
      `Pedido nº ${order.id} · referencia ${order.reference}.`,
      "",
      "Revisa que llegó y pasa el pedido a verificación en Admin → Pedidos web.",
    ].join("\n"),
  }).catch((e) => console.error("[pedidos] aviso de entrega no enviado:", e));
}
