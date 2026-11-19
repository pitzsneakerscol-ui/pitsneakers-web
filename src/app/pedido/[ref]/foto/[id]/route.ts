import { getOrderByRef, getOrderPhoto, listOrderPhotos } from "@/lib/catalog-orders";
import { isVerified } from "@/lib/verification-shared";

export const dynamic = "force-dynamic";

/**
 * Foto de recepción de un pedido, para el CLIENTE dueño del pedido: se pide con la referencia (PITS-XXXXXXX, la misma de
 * la página "Estado de tu pedido") y solo se entrega si el pedido está pagado, el par ya fue verificado y la foto es de ese pedido.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ ref: string; id: string }> }) {
  const { ref, id: rawId } = await ctx.params;
  const reference = decodeURIComponent(ref).trim().toUpperCase();
  const id = Number(rawId);
  if (!/^PITS-[A-Z0-9]{7}$/.test(reference) || !Number.isInteger(id) || id <= 0) return new Response("No encontrada", { status: 404 });

  const order = await getOrderByRef(reference);
  if (!order || order.status !== "pagado" || !isVerified(order.verifChecks)) return new Response("No encontrada", { status: 404 });
  const ids = (await listOrderPhotos([order.id])).get(order.id) ?? [];
  if (!ids.includes(id)) return new Response("No encontrada", { status: 404 });

  const photo = await getOrderPhoto(id);
  if (!photo) return new Response("No encontrada", { status: 404 });
  return new Response(photo.data as BodyInit, {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
