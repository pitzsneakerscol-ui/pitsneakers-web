import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDbConfigured } from "@/lib/db";
import { googleProfileFromCode, isGoogleConfigured } from "@/lib/google-auth";
import { createBuyerSession, upsertGoogleBuyer } from "@/lib/buyers";
import { safeNext } from "@/lib/buyer-shared";

export const dynamic = "force-dynamic";

/** Google vuelve aquí con un código: se valida el "state", se crea o enlaza la cuenta y se abre la sesión. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = () => NextResponse.redirect(new URL("/cuenta/ingresar?error=google", url));
  if (!isDbConfigured() || !isGoogleConfigured()) return fail();

  const store = await cookies();
  const saved = store.get("pits_gstate")?.value ?? "";
  const [state, nextRaw = ""] = saved.split("|");
  store.delete("pits_gstate");
  const code = url.searchParams.get("code");
  if (!code || !state || state !== url.searchParams.get("state")) return fail();

  try {
    const profile = await googleProfileFromCode(code, `${url.origin}/api/cuenta/google/callback`);
    if (!profile) return fail();
    const buyer = await upsertGoogleBuyer(profile);
    await createBuyerSession(buyer.id);
    return NextResponse.redirect(new URL(safeNext(decodeURIComponent(nextRaw)), url));
  } catch (e) {
    console.error("[cuenta] google:", e);
    return fail();
  }
}
