import { getModelPhoto } from "@/lib/catalog-models";

/**
 * Fotos de los modelos creados desde el panel: viven en la base y se sirven en la misma dirección que las del archivo
 * (/products/<nombre>.webp), así el resto de la página no distingue unas de otras. Las fotos del archivo (public/products)
 * siempre ganan: aquí solo llega lo que no existe como archivo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const data = await getModelPhoto((await params).file, false);
  if (!data) return new Response("No encontrada", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      // El nombre lleva la huella del contenido: si la foto cambia, cambia el nombre.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
