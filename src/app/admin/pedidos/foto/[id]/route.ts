import { requireAdmin } from "@/lib/auth";
import { getOrderPhoto } from "@/lib/catalog-orders";

export const dynamic = "force-dynamic";

/** Foto de recepción de un pedido. Solo la ve el administrador: son evidencia interna, no se publican. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await ctx.params).id);
  const photo = Number.isInteger(id) && id > 0 ? await getOrderPhoto(id) : null;
  if (!photo) return new Response("No encontrada", { status: 404 });
  // Una foto no cambia nunca (se borra y se sube otra), así que el navegador puede guardarla.
  return new Response(photo.data as BodyInit, { headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
