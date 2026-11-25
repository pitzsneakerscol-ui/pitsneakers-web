import { getModelPhoto } from "@/lib/catalog-models";

/** Miniatura de una foto de modelo creada desde el panel (ver ../../[file]/route.ts). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const data = await getModelPhoto((await params).file, true);
  if (!data) return new Response("No encontrada", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
