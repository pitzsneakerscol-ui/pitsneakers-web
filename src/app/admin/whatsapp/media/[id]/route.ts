import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { fetchMedia } from "@/lib/wa-cloud";

export const dynamic = "force-dynamic";

/** Foto o archivo que mandó un cliente por WhatsApp (solo el dueño). Meta guarda estos archivos unos 30 días. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("No autorizado", { status: 401 });
  const { id } = await ctx.params;
  const media = await fetchMedia(id);
  if (!media) return new Response("No se pudo cargar el archivo (puede haber vencido).", { status: 404 });
  const safe = /^(image\/(jpeg|png|webp)|audio\/(ogg|mpeg|mp4)|video\/mp4|application\/pdf)$/.test(media.mime) ? media.mime : "application/octet-stream";
  return new Response(media.data, {
    headers: { "Content-Type": safe, "Cache-Control": "private, max-age=3600", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" },
  });
}
