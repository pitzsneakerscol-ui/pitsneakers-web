import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { getReviewPhoto } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** Foto de una reseña: pública si está aprobada; pendiente o rechazada solo la ve el dueño. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("No encontrada", { status: 404 });

  const photo = await getReviewPhoto(id);
  if (!photo) return new Response("No encontrada", { status: 404 });

  const approved = photo.status === "approved";
  if (!approved) {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return new Response("No encontrada", { status: 404 });
  }
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.type,
      "Content-Length": String(photo.data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": approved ? "public, max-age=31536000, immutable" : "private, no-store",
    },
  });
}
