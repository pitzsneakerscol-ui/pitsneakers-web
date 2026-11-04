import { unsubscribeByToken } from "@/lib/campaigns";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * "Cancelar suscripción" de un clic (cabecera List-Unsubscribe-Post de Gmail y Yahoo): llega un POST con el código del contacto.
 * Se responde 200 aunque el código no exista, para no revelar qué códigos son válidos.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!isDbConfigured()) return new Response("No disponible", { status: 404 });
  const { token } = await params;
  await unsubscribeByToken(token);
  return new Response("Listo, te diste de baja.", { status: 200 });
}
