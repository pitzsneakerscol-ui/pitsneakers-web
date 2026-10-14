import { isDbConfigured } from "@/lib/db";
import { getBuyer, listFavoriteSlugs, setFavorite } from "@/lib/buyers";

export const dynamic = "force-dynamic";

const H = { "Cache-Control": "no-store" };
const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;

/** Favoritos del comprador con sesión: la lista de deseos que viaja entre dispositivos. */
export async function GET() {
  if (!isDbConfigured()) return Response.json({ in: false }, { headers: H });
  const b = await getBuyer();
  if (!b) return Response.json({ in: false }, { headers: H });
  return Response.json({ in: true, id: b.id, slugs: await listFavoriteSlugs(b.id) }, { headers: H });
}

/** Body: { slug, on } para uno, o { add: [slugs] } para subir de golpe los guardados en el navegador. */
export async function POST(request: Request) {
  if (!isDbConfigured()) return Response.json({ in: false }, { headers: H });
  const b = await getBuyer();
  if (!b) return Response.json({ in: false }, { status: 401, headers: H });
  let body: { slug?: unknown; on?: unknown; add?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "json" }, { status: 400, headers: H });
  }
  if (Array.isArray(body.add)) {
    for (const s of body.add.slice(0, 60)) if (typeof s === "string" && SLUG.test(s)) await setFavorite(b.id, s, true);
  } else if (typeof body.slug === "string" && SLUG.test(body.slug)) {
    await setFavorite(b.id, body.slug, body.on === true);
  }
  return Response.json({ in: true, slugs: await listFavoriteSlugs(b.id) }, { headers: H });
}
