import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { googleAuthUrl, isGoogleConfigured } from "@/lib/google-auth";
import { safeNext } from "@/lib/buyer-shared";

export const dynamic = "force-dynamic";

/** Empieza el ingreso con Google: guarda un "state" en una cookie y manda a Google. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isGoogleConfigured()) return NextResponse.redirect(new URL("/cuenta/ingresar?error=google", url));
  const state = randomBytes(24).toString("base64url");
  const next = safeNext(url.searchParams.get("next") ?? "");
  const res = NextResponse.redirect(googleAuthUrl(`${url.origin}/api/cuenta/google/callback`, state));
  res.cookies.set("pits_gstate", `${state}|${encodeURIComponent(next)}`, { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
