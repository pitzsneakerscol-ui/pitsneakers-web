import sharp from "sharp";

export const dynamic = "force-dynamic";

/**
 * Foto de un par del catálogo lista para un correo: las fotos del catálogo no tienen fondo (son transparentes) y al pasarlas a JPEG
 * quedan sobre negro. Esta ruta las pone sobre el color de fondo del correo y las devuelve en JPEG, que abre en cualquier correo.
 *   /api/email-foto?f=ASICS-21.4caff028.webp&w=800&bg=f5f5f5
 * Solo sirve fotos de /products/ (nombre de archivo simple), de ancho 200 a 1200 y un color hexadecimal.
 */
const FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.(webp|png|jpe?g)$/;
const HEX = /^[0-9a-fA-F]{6}$/;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const f = u.searchParams.get("f") ?? "";
  const bg = u.searchParams.get("bg") ?? "ffffff";
  const w = Math.round(Number(u.searchParams.get("w") ?? 800));
  if (!FILE.test(f) || !HEX.test(bg) || !Number.isFinite(w) || w < 200 || w > 1200) return new Response("No encontrada", { status: 404 });

  const src = await fetch(new URL(`/products/${f}`, u.origin), { signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!src || !src.ok) return new Response("No encontrada", { status: 404 });

  try {
    const jpeg = await sharp(Buffer.from(await src.arrayBuffer()))
      .resize({ width: w, withoutEnlargement: true })
      .flatten({ background: `#${bg}` })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("No se pudo procesar la foto", { status: 422 });
  }
}
