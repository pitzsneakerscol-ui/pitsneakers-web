import { getCurrentUser } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { getItemProof } from "@/lib/item-delivery";

export const dynamic = "force-dynamic";

/** Foto de prueba de entrega de un par: solo la ve su dueño o el equipo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("No encontrada", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new Response("No encontrada", { status: 404 });
  const proof = await getItemProof(id);
  if (!proof || (!user.isAdmin && proof.userId !== user.id)) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(proof.data), {
    headers: {
      "Content-Type": proof.mime,
      "Content-Length": String(proof.data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
