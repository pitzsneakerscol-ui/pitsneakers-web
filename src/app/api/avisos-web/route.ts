import { clientIp, getCurrentUser, rateLimitHit } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { isAllowedEndpoint, isWebPushConfigured, removeSubscription, saveSubscription, sendWebPush } from "@/lib/web-push";

export const dynamic = "force-dynamic";

const bad = (status = 400) => Response.json({ ok: false }, { status });

/** Lee y valida el cuerpo; solo revendedores con sesión (no el admin, igual que los avisos de la app). */
async function context() {
  if (!isDbConfigured() || !isWebPushConfigured()) return { error: bad(503) };
  const user = await getCurrentUser();
  if (!user || user.isAdmin) return { error: bad(401) };
  if (!(await rateLimitHit(`webpush:${await clientIp()}`, 60, 60 * 60 * 1000))) return { error: bad(429) };
  return { user };
}

/**
 * POST { subscription }  → guarda el navegador de este revendedor para mandarle avisos.
 * POST { test: true }    → le manda un aviso de prueba.
 */
export async function POST(request: Request) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  let body: { subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }; test?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return bad();
  }

  if (body.test === true) {
    const r = await sendWebPush(ctx.user.id, { title: "Avisos activados ✅", body: "Así te llegarán los avisos de tu inventario, ventas y consultas.", url: "/revendedores/avisos" });
    return Response.json({ ok: r.sent > 0, ...r });
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") return bad();
  // El endpoint es siempre una dirección https del servicio de avisos del navegador (Chrome, Firefox, Safari, Windows).
  if (endpoint.length > 1000 || p256dh.length > 200 || auth.length > 100 || !isAllowedEndpoint(endpoint)) return bad();
  await saveSubscription(ctx.user.id, { endpoint, p256dh, auth });
  return Response.json({ ok: true });
}

/** DELETE { endpoint } → este navegador deja de recibir avisos. */
export async function DELETE(request: Request) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  let body: { endpoint?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return bad();
  }
  if (typeof body.endpoint !== "string" || body.endpoint.length > 1000) return bad();
  await removeSubscription(ctx.user.id, body.endpoint);
  return Response.json({ ok: true });
}
