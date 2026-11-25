import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { getUsedPhoto } from "@/lib/used-pairs";

export const dynamic = "force-dynamic";

/**
 * Foto real de un par usado. Es pública solo cuando el dueño aprobó el par; mientras está en revisión (o si se rechazó)
 * la ven únicamente su vendedor y el equipo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("No encontrada", { status: 404 });

  const photo = await getUsedPhoto(id);
  if (!photo) return new Response("No encontrada", { status: 404 });

  const approved = photo.status === "aprobado";
  if (!approved) {
    const user = await getCurrentUser();
    if (!user || (!user.isAdmin && user.id !== photo.userId)) return new Response("No encontrada", { status: 404 });
  }

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(photo.data.length),
      "X-Content-Type-Options": "nosniff",
      // Las fotos aprobadas no cambian (cada foto tiene su id): pueden guardarse en la CDN y en el navegador.
      "Cache-Control": approved ? "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" : "private, no-store",
    },
  });
}
