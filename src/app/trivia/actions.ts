"use server";

import { rateLimitHit } from "@/lib/auth";
import { getBidder } from "@/lib/auction";
import { isDbConfigured } from "@/lib/db";
import { recordAnswer } from "@/lib/trivia";

/** Guarda la respuesta del jugador. El servidor decide si llegó a tiempo y si es correcta. */
export async function answerQuestion(questionId: number, choice: number): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!isDbConfigured()) return { ok: false, error: "La trivia aún no está disponible." };
    const bidder = await getBidder();
    if (!bidder) return { ok: false, error: "Tu sesión venció. Entra de nuevo con tu pase." };
    if (!(await rateLimitHit(`trivia:${bidder.id}`, 60, 60 * 1000))) return { ok: false, error: "Vas muy rápido." };
    const r = await recordAnswer(bidder.id, Number(questionId), Number(choice));
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  } catch (e) {
    console.error("[trivia] responder:", e);
    return { ok: false, error: "No se pudo guardar tu respuesta." };
  }
}
