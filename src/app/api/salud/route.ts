import { getDb, isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Clasifica un error de conexión sin revelar datos sensibles (ni la URL ni el token). */
function kindOf(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e).toLowerCase();
  if (/401|403|unauthor|jwt|auth token|authentication/.test(m)) return "token-invalido";
  if (/enotfound|getaddrinfo|fetch failed|econnrefused|network|timeout|etimedout/.test(m)) return "url-o-red";
  if (/cannot find module|module not found|\.node|native|binding/.test(m)) return "modulo-no-encontrado";
  if (/url|scheme|invalid/.test(m)) return "url-invalida";
  if (/sqlite|syntax|no such|constraint|table|column/.test(m)) return "consulta-sql";
  return "desconocido";
}

/** Chequeo rápido: ¿la página puede hablar con la base de datos? No devuelve información sensible. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!isDbConfigured()) return Response.json({ db: "sin-configurar" }, { status: 503, headers });
  try {
    const db = await getDb();
    await db.execute("SELECT 1");
    return Response.json({ db: "ok" }, { headers });
  } catch (e) {
    console.error("[salud] error de base de datos:", e);
    // Pistas sin datos sensibles: cómo empieza la URL (solo el esquema) y si traía espacios o comillas.
    const raw = process.env.DATABASE_URL ?? "";
    const pista = {
      esquema: raw.trim().replace(/^["']+/, "").split("://")[0].slice(0, 12),
      espaciosOComillas: raw !== raw.trim() || /["']/.test(raw),
      largo: raw.length,
    };
    return Response.json({ db: "error", tipo: kindOf(e), pista }, { status: 503, headers });
  }
}
