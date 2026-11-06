import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { getVerificationPhoto } from "@/lib/item-verification";

export const dynamic = "force-dynamic";

/** Foto de verificación de un par (pedido de la web o inventario): solo la ve su vendedor y el equipo. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const { kind, id: rawId } = await params;
  const id = Number(rawId);
  if ((kind !== "pedido" && kind !== "par") || !Number.isInteger(id) || id <= 0) return new Response("No encontrada", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new Response("No encontrada", { status: 404 });
  const photo = await getVerificationPhoto(kind, id);
  if (!photo || (!user.isAdmin && photo.ownerId !== user.id)) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(photo.data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
