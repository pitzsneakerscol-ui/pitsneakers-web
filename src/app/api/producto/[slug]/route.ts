import { NextResponse } from "next/server";
import { getGroupBySlug } from "@/lib/products";

// Datos de un par para la "vista rápida" del catálogo.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(group, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
