"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { fromLocalInput } from "@/lib/auction-shared";
import { triviaAnnounceEmail } from "@/lib/trivia-emails";
import { createQuickGame } from "@/lib/trivia";
import type { ActionState } from "@/lib/reseller-shared";

const text = (fd: FormData, key: string, max: number): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};
const num = (fd: FormData, key: string, min: number, max: number, fallback: number): number => {
  const raw = text(fd, key, 12).replace(/[^\d]/g, "");
  if (raw === "") return fallback;
  return Math.min(max, Math.max(min, Number(raw)));
};

const refresh = () => revalidatePath("/admin/trivia");

/** Crea o actualiza un juego de trivia (título, hora, tiempos, premio y si ya lo ven los jugadores). */
export async function saveGame(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = text(fd, "title", 80) || "Trivia Pitsneakers";
  const startsAt = fromLocalInput(text(fd, "starts", 20));
  if (!startsAt) return { error: "Elige la fecha y la hora de inicio." };
  const seconds = num(fd, "seconds", 5, 60, 15);
  const gap = num(fd, "gap", 3, 30, 6);
  const prize = num(fd, "prize", 1000, 1_000_000, 10000);
  const maxWinners = num(fd, "max_winners", 0, 500, 10);
  const minCorrect = num(fd, "min_correct", 0, 100, 0);
  const published = fd.get("published") === "1" ? 1 : 0;
  const id = Number(fd.get("id")) || 0;
  const db = await getDb();
  if (id) {
    const cur = await db.execute({ sql: "SELECT finalized FROM trivia_games WHERE id = ?", args: [id] });
    if (cur.rows[0] && Number(cur.rows[0].finalized) === 1) return { error: "Este juego ya terminó y se repartieron los premios. Crea uno nuevo." };
    await db.execute({ sql: "UPDATE trivia_games SET title=?, starts_at=?, seconds=?, gap=?, prize=?, max_winners=?, min_correct=?, published=? WHERE id=?", args: [title, startsAt, seconds, gap, prize, maxWinners, minCorrect, published, id] });
  } else {
    await db.execute({ sql: "INSERT INTO trivia_games (title, starts_at, seconds, gap, prize, max_winners, min_correct, published, created_at) VALUES (?,?,?,?,?,?,?,?,?)", args: [title, startsAt, seconds, gap, prize, maxWinners, minCorrect, published, Date.now()] });
  }
  refresh();
  return { ok: true, message: "Juego guardado." };
}

export async function addQuestion(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const gameId = Number(fd.get("game_id")) || 0;
  if (!gameId) return { error: "Primero guarda el juego." };
  const q = text(fd, "text", 200);
  const options = ["a", "b", "c", "d"].map((k) => text(fd, `opt_${k}`, 80));
  const correct = Number(fd.get("correct"));
  if (!q) return { error: "Escribe la pregunta." };
  if (options.some((o) => !o)) return { error: "Escribe las cuatro opciones." };
  if (new Set(options.map((o) => o.toLowerCase())).size < 4) return { error: "Las opciones no pueden repetirse." };
  if (![0, 1, 2, 3].includes(correct)) return { error: "Marca cuál es la respuesta correcta." };
  const db = await getDb();
  const g = await db.execute({ sql: "SELECT starts_at FROM trivia_games WHERE id = ?", args: [gameId] });
  if (!g.rows[0]) return { error: "No encontramos el juego." };
  if (Number(g.rows[0].starts_at) <= Date.now()) return { error: "El juego ya empezó: no se pueden agregar preguntas." };
  const n = await db.execute({ sql: "SELECT COUNT(*) AS n FROM trivia_questions WHERE game_id = ?", args: [gameId] });
  await db.execute({ sql: "INSERT INTO trivia_questions (game_id, position, text, options, correct) VALUES (?,?,?,?,?)", args: [gameId, Number(n.rows[0].n), q, JSON.stringify(options), correct] });
  refresh();
  return { ok: true, message: "Pregunta agregada." };
}

export async function deleteQuestion(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (!id) return;
  const db = await getDb();
  const q = await db.execute({ sql: "SELECT t.game_id AS gid, g.starts_at AS s FROM trivia_questions t JOIN trivia_games g ON g.id = t.game_id WHERE t.id = ?", args: [id] });
  if (!q.rows[0] || Number(q.rows[0].s) <= Date.now()) return;
  await db.execute({ sql: "DELETE FROM trivia_questions WHERE id = ?", args: [id] });
  // Reordena las posiciones para que no queden huecos.
  const rest = await db.execute({ sql: "SELECT id FROM trivia_questions WHERE game_id = ? ORDER BY position, id", args: [Number(q.rows[0].gid)] });
  for (const [i, r] of rest.rows.entries()) await db.execute({ sql: "UPDATE trivia_questions SET position = ? WHERE id = ?", args: [i, Number(r.id)] });
  refresh();
}

export async function deleteGame(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (!id) return;
  const db = await getDb();
  const g = await db.execute({ sql: "SELECT finalized, starts_at FROM trivia_games WHERE id = ?", args: [id] });
  if (!g.rows[0] || Number(g.rows[0].finalized) === 1) return;
  await db.execute({ sql: "DELETE FROM trivia_answers WHERE game_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM trivia_questions WHERE game_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM trivia_games WHERE id = ?", args: [id] });
  refresh();
}

/** Avisa a la lista de espera de la trivia (de a 40 por clic; vuelve a pulsar hasta que diga "Todos avisados"). */
export async function announceTrivia(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!isEmailConfigured()) return { error: "El envío de correos no está configurado." };
  const id = Number(fd.get("game_id")) || 0;
  const db = await getDb();
  const g = await db.execute({ sql: "SELECT title, starts_at, prize, published FROM trivia_games WHERE id = ?", args: [id] });
  const row = g.rows[0];
  if (!row) return { error: "Primero crea el juego." };
  if (Number(row.published) !== 1) return { error: "Publica el juego antes de avisar." };
  const n = await db.execute({ sql: "SELECT COUNT(*) AS n FROM trivia_questions WHERE game_id = ?", args: [id] });
  const questions = Number(n.rows[0].n);
  if (questions === 0) return { error: "Agrega preguntas antes de avisar." };
  const { subject, body } = triviaAnnounceEmail({ title: String(row.title), startsAt: Number(row.starts_at), prize: Number(row.prize), questions });
  const pending = await db.execute({ sql: "SELECT id, email FROM waitlist WHERE trivia_announced != ? ORDER BY id LIMIT 40", args: [id] });
  if (pending.rows.length === 0) return { ok: true, message: "Todos los inscritos ya fueron avisados." };
  let sent = 0, failed = 0;
  for (const r of pending.rows) {
    const res = await sendEmail({ to: String(r.email), subject, body });
    if (res.ok) { sent++; await db.execute({ sql: "UPDATE waitlist SET trivia_announced = ? WHERE id = ?", args: [id, Number(r.id)] }); } else failed++;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  const left = Number((await db.execute({ sql: "SELECT COUNT(*) AS n FROM waitlist WHERE trivia_announced != ?", args: [id] })).rows[0].n);
  refresh();
  return { ok: failed === 0, message: `Enviados: ${sent}${failed ? ` · fallidos: ${failed}` : ""}.${left > 0 ? ` Faltan ${left}: pulsa de nuevo.` : " Ya están todos avisados."}`, ...(failed ? { error: "Algunos correos fallaron; vuelve a intentar." } : {}) };
}

/** Lanza una trivia que empieza en unos minutos, con preguntas del banco. Después puedes avisar a la lista desde el mismo juego. */
export async function launchNow(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = text(fd, "title", 80) || "Trivia relámpago";
  const inMinutes = num(fd, "minutes", 1, 240, 5);
  const count = num(fd, "count", 3, 30, 10);
  const seconds = num(fd, "seconds", 5, 60, 15);
  let id: number;
  try {
    id = await createQuickGame({ title, inMinutes, count, seconds });
  } catch (e) {
    unstable_rethrow(e);
    console.error("[trivia] lanzar ahora:", e);
    return { error: "No se pudo crear el juego (¿ya hay otro que empieza a esa misma hora?). Intenta de nuevo." };
  }
  refresh();
  redirect(`/admin/trivia?juego=${id}`);
}
