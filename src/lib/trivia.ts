import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { maskEmail } from "@/lib/auction-shared";
import { phaseAt, endsAt, openAt, type GameTiming, type TriviaGameView, type TriviaQuestionView, type TriviaResult, type TriviaState } from "@/lib/trivia-shared";
import { creditWinnerEmail } from "@/lib/trivia-emails";
import { weeklyTrivia as W } from "@/config/trivia";
import { TRIVIA_BANK } from "@/data/trivia-bank";

/** Hora del servidor (las páginas no pueden llamar Date.now() directamente al renderizar). */
export const triviaNow = (): number => Date.now();

const toView = (r: Record<string, unknown>, total: number): TriviaGameView => ({
  id: Number(r.id),
  title: String(r.title),
  startsAt: Number(r.starts_at),
  seconds: Number(r.seconds),
  gap: Number(r.gap),
  prize: Number(r.prize),
  maxWinners: Number(r.max_winners),
  total,
});

async function questionCount(gameId: number): Promise<number> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM trivia_questions WHERE game_id = ?", args: [gameId] });
  return Number(r.rows[0].n);
}

/* ---------- Trivia semanal automática ---------- */

const BOGOTA = "America/Bogota";
const dayInfo = (ms: number): { date: string; weekday: number } => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: BOGOTA, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(String(parts.weekday));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: wd };
};

/** Próximo jueves a las 11:00 (hora de Colombia) cuyo juego todavía no ha terminado. */
export function nextWeeklyStart(now: number): number {
  const duration = (W.seconds + W.gap) * W.questions * 1000;
  for (let k = 0; k <= 8; k++) {
    const { date, weekday } = dayInfo(now + k * 86_400_000);
    if (weekday !== W.weekday) continue;
    const start = Date.parse(`${date}T${String(W.hour).padStart(2, "0")}:${String(W.minute).padStart(2, "0")}:00-05:00`);
    if (start + duration > now) return start;
  }
  return now + 7 * 86_400_000;
}

const hashKey = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let lastEnsure = 0;

/** Crea sola la trivia del próximo jueves (con preguntas del banco que no se hayan usado hace poco). Se llama al abrir la trivia, el panel y la tarea diaria. */
export async function ensureWeeklyGame(): Promise<void> {
  if (process.env.TRIVIA_AUTO === "0") return;
  const now = Date.now();
  if (now - lastEnsure < 60_000) return;
  lastEnsure = now;
  try {
    const db = await getDb();
    const start = nextWeeklyStart(now);
    const ins = await db.execute({
      sql: "INSERT OR IGNORE INTO trivia_games (title, starts_at, seconds, gap, prize, max_winners, min_correct, published, created_at) VALUES (?,?,?,?,?,?,?,1,?)",
      args: [W.title, start, W.seconds, W.gap, W.prize, W.maxWinners, W.minCorrect, now],
    });
    if (ins.rowsAffected === 0) return;
    await fillFromBank(Number(ins.lastInsertRowid), W.questions);
  } catch (e) {
    console.error("[trivia] no se pudo crear la trivia semanal:", e);
  }
}

/** Pone en un juego preguntas del banco que no se hayan usado hace poco (si el banco se agota, reutiliza las más viejas). */
async function fillFromBank(gameId: number, count: number): Promise<void> {
  const db = await getDb();
  {
    const used = await db.execute("SELECT bank_key FROM trivia_questions WHERE bank_key != '' ORDER BY id DESC LIMIT 400");
    const recency = [...new Set(used.rows.map((r) => String(r.bank_key)))]; // más recientes primero
    const bank = TRIVIA_BANK.map((q) => ({ q, key: hashKey(q[0]) }));
    const fresh = bank.filter((b) => !recency.includes(b.key));
    // Si el banco se agota, se reutilizan primero las preguntas que se usaron hace más tiempo.
    const oldFirst = bank.filter((b) => recency.includes(b.key)).sort((a, b) => recency.indexOf(b.key) - recency.indexOf(a.key));
    const picked = [...shuffled(fresh), ...oldFirst].slice(0, count);
    let position = 0;
    for (const { q, key } of shuffled(picked)) {
      const options = shuffled([q[1], ...q[2]]);
      await db.execute({
        sql: "INSERT INTO trivia_questions (game_id, position, text, options, correct, bank_key) VALUES (?,?,?,?,?,?)",
        args: [gameId, position++, q[0], JSON.stringify(options), options.indexOf(q[1]), key],
      });
    }
  }
}

/** Crea un juego que empieza en unos minutos, con preguntas del banco. Para lanzar una trivia "ahora" sin esperar al jueves. */
export async function createQuickGame(opts: { title: string; inMinutes: number; count: number; seconds: number }): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const count = Math.max(3, Math.min(30, Math.round(opts.count)));
  const ins = await db.execute({
    sql: "INSERT INTO trivia_games (title, starts_at, seconds, gap, prize, max_winners, min_correct, published, created_at) VALUES (?,?,?,?,?,?,?,1,?)",
    args: [opts.title, now + Math.max(1, opts.inMinutes) * 60_000, opts.seconds, W.gap, W.prize, W.maxWinners, Math.min(W.minCorrect, count), now],
  });
  const gameId = Number(ins.lastInsertRowid);
  await fillFromBank(gameId, count);
  return gameId;
}

/** El juego que ven los jugadores: el próximo o el que está en curso; si no hay, el último que terminó. */
export async function getActiveGame(): Promise<(TriviaGameView & { minCorrect: number; finalized: boolean }) | null> {
  await ensureWeeklyGame();
  const db = await getDb();
  const r = await db.execute("SELECT * FROM trivia_games WHERE published = 1 ORDER BY starts_at");
  if (r.rows.length === 0) return null;
  const now = Date.now();
  let pick: Record<string, unknown> | null = null;
  let pickTotal = 0;
  for (const row of r.rows) {
    const total = await questionCount(Number(row.id));
    if (total === 0) continue;
    const g = toView(row, total);
    if (endsAt(g) > now) { pick = row; pickTotal = total; break; }
    pick = row; pickTotal = total; // el último ya terminado
  }
  if (!pick) return null;
  return { ...toView(pick, pickTotal), minCorrect: Number(pick.min_correct), finalized: Number(pick.finalized) === 1 };
}

async function questionAt(gameId: number, index: number): Promise<(TriviaQuestionView & { correct: number }) | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT id, text, options, correct FROM trivia_questions WHERE game_id = ? ORDER BY position, id LIMIT 1 OFFSET ?", args: [gameId, index] });
  const x = r.rows[0];
  if (!x) return null;
  return { id: Number(x.id), text: String(x.text), options: JSON.parse(String(x.options)) as string[], correct: Number(x.correct) };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => "CRED-" + Array.from(randomBytes(7), (b) => ALPHABET[b % ALPHABET.length]).join("");

/** Cierra el juego: calcula quién ganó y le crea su código de crédito (una sola vez, aunque lo pidan varios a la vez). */
export async function finalizeGame(gameId: number): Promise<void> {
  const db = await getDb();
  const g = await db.execute({ sql: "SELECT * FROM trivia_games WHERE id = ?", args: [gameId] });
  const row = g.rows[0];
  if (!row) return;
  const claim = await db.execute({ sql: "UPDATE trivia_games SET finalized = 1 WHERE id = ? AND finalized = 0", args: [gameId] });
  if (claim.rowsAffected === 0) return;

  const total = await questionCount(gameId);
  const required = Number(row.min_correct) > 0 ? Math.min(Number(row.min_correct), total) : total;
  const agg = await db.execute({
    sql: "SELECT waitlist_id, SUM(correct) AS c, SUM(ms) AS t FROM trivia_answers WHERE game_id = ? GROUP BY waitlist_id",
    args: [gameId],
  });
  let ranked = agg.rows
    .map((x) => ({ id: Number(x.waitlist_id), c: Number(x.c), t: Number(x.t) }))
    .filter((x) => x.c >= required)
    .sort((a, b) => b.c - a.c || a.t - b.t);
  const cap = Number(row.max_winners);
  if (cap > 0) ranked = ranked.slice(0, cap);

  for (const w of ranked) {
    const code = newCode();
    await db.execute({ sql: "INSERT INTO credit_codes (code, amount, waitlist_id, game_id, created_at) VALUES (?, ?, ?, ?, ?)", args: [code, Number(row.prize), w.id, gameId, Date.now()] });
    if (isEmailConfigured()) {
      const e = await db.execute({ sql: "SELECT email FROM waitlist WHERE id = ?", args: [w.id] });
      const to = e.rows[0] ? String(e.rows[0].email) : "";
      if (to) {
        const { subject, body } = creditWinnerEmail({ code, amount: Number(row.prize), title: String(row.title) });
        void sendEmail({ to, subject, body }).catch(() => undefined);
      }
    }
  }
}

/** Resultado final del juego para un jugador (y el podio con correos enmascarados). */
async function resultFor(game: TriviaGameView & { minCorrect: number }, waitlistId: number): Promise<TriviaResult> {
  const db = await getDb();
  const total = game.total;
  const required = game.minCorrect > 0 ? Math.min(game.minCorrect, total) : total;
  const agg = await db.execute({
    sql: `SELECT a.waitlist_id AS id, w.email AS email, SUM(a.correct) AS c, SUM(a.ms) AS t
          FROM trivia_answers a JOIN waitlist w ON w.id = a.waitlist_id WHERE a.game_id = ? GROUP BY a.waitlist_id`,
    args: [game.id],
  });
  const ranked = agg.rows
    .map((x) => ({ id: Number(x.id), who: maskEmail(String(x.email)), c: Number(x.c), t: Number(x.t) }))
    .sort((a, b) => b.c - a.c || a.t - b.t);
  const mineIdx = ranked.findIndex((x) => x.id === waitlistId);
  const mine = mineIdx >= 0 ? ranked[mineIdx] : null;
  const codeRow = await db.execute({ sql: "SELECT code FROM credit_codes WHERE game_id = ? AND waitlist_id = ?", args: [game.id, waitlistId] });
  return {
    correct: mine?.c ?? 0,
    total,
    required,
    rank: mineIdx >= 0 ? mineIdx + 1 : null,
    winner: codeRow.rows.length > 0,
    code: codeRow.rows[0] ? String(codeRow.rows[0].code) : null,
    top: ranked.slice(0, 10).map((x) => ({ who: x.who, correct: x.c, seconds: Math.round(x.t / 100) / 10 })),
  };
}

/** Foto del juego para un jugador: solo se entrega la pregunta que está abierta (y la respuesta correcta cuando ya se cerró). */
export async function getState(waitlistId: number): Promise<TriviaState> {
  const now = Date.now();
  const game = await getActiveGame();
  const empty: TriviaState = { now, game: null, phase: "lobby", index: -1, until: null, question: null, mine: null, correct: null, score: 0, result: null };
  if (!game) return empty;
  const timing: GameTiming = game;
  const ph = phaseAt(timing, now);
  const db = await getDb();
  const base: TriviaState = { ...empty, game: { id: game.id, title: game.title, startsAt: game.startsAt, seconds: game.seconds, gap: game.gap, prize: game.prize, maxWinners: game.maxWinners, total: game.total }, phase: ph.phase, index: ph.index, until: ph.until };

  // Aciertos en preguntas ya cerradas.
  const closedIdx = ph.phase === "open" ? ph.index : ph.phase === "reveal" ? ph.index + 1 : ph.phase === "ended" ? game.total : 0;
  if (closedIdx > 0) {
    const qs = await db.execute({ sql: "SELECT id FROM trivia_questions WHERE game_id = ? ORDER BY position, id LIMIT ?", args: [game.id, closedIdx] });
    const ids = qs.rows.map((x) => Number(x.id));
    if (ids.length) {
      const score = await db.execute({
        sql: `SELECT COALESCE(SUM(correct), 0) AS c FROM trivia_answers WHERE waitlist_id = ? AND question_id IN (${ids.map(() => "?").join(",")})`,
        args: [waitlistId, ...ids],
      });
      base.score = Number(score.rows[0].c);
    }
  }

  if (ph.phase === "open" || ph.phase === "reveal") {
    const q = await questionAt(game.id, ph.index);
    if (q) {
      const mine = await db.execute({ sql: "SELECT choice FROM trivia_answers WHERE question_id = ? AND waitlist_id = ?", args: [q.id, waitlistId] });
      base.mine = mine.rows[0] ? Number(mine.rows[0].choice) : null;
      base.question = { id: q.id, text: q.text, options: q.options };
      if (ph.phase === "reveal") base.correct = q.correct;
    }
  }
  if (ph.phase === "ended") {
    if (!game.finalized) await finalizeGame(game.id);
    base.result = await resultFor(game, waitlistId);
  }
  return base;
}

export type AnswerResult = { ok: true } | { ok: false; error: string };

export async function recordAnswer(waitlistId: number, questionId: number, choice: number): Promise<AnswerResult> {
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return { ok: false, error: "Respuesta no válida." };
  const game = await getActiveGame();
  if (!game) return { ok: false, error: "No hay juego en curso." };
  const now = Date.now();
  const ph = phaseAt(game, now);
  if (ph.phase !== "open") return { ok: false, error: "Se acabó el tiempo de esta pregunta." };
  const q = await questionAt(game.id, ph.index);
  if (!q || q.id !== Number(questionId)) return { ok: false, error: "Esa pregunta ya cerró." };
  const db = await getDb();
  const ms = Math.max(0, now - openAt(game, ph.index));
  const r = await db.execute({
    sql: "INSERT OR IGNORE INTO trivia_answers (game_id, question_id, waitlist_id, choice, correct, ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [game.id, q.id, waitlistId, choice, choice === q.correct ? 1 : 0, ms, now],
  });
  return r.rowsAffected > 0 ? { ok: true } : { ok: false, error: "Ya respondiste esta pregunta." };
}

/* ---------- Crédito (códigos de premio) ---------- */

const HOLD_MS = 2 * 60 * 60 * 1000;

export interface CreditCheck {
  ok: boolean;
  error?: string;
  amount?: number;
}

/** ¿Sirve este código para esta compra? Es personal: debe usarse con el correo con el que se inscribió el ganador. */
export async function checkCredit(code: string, email: string, ref: string): Promise<CreditCheck> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT c.id, c.amount, c.used_at, c.reserved_ref, c.reserved_at, w.email AS email
          FROM credit_codes c JOIN waitlist w ON w.id = c.waitlist_id WHERE c.code = ?`,
    args: [code.trim().toUpperCase()],
  });
  const x = r.rows[0];
  if (!x) return { ok: false, error: "Ese código no existe. Revisa que esté bien escrito." };
  if (x.used_at !== null) return { ok: false, error: "Ese código ya se usó." };
  if (String(x.email).toLowerCase() !== email.trim().toLowerCase()) return { ok: false, error: "Ese código es personal: úsalo con el correo con el que juegas." };
  const held = x.reserved_at !== null && Date.now() - Number(x.reserved_at) < HOLD_MS && String(x.reserved_ref) !== ref;
  if (held) return { ok: false, error: "Ese código está en otra compra en proceso. Intenta en un rato." };
  return { ok: true, amount: Number(x.amount) };
}

export async function reserveCredit(code: string, ref: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE credit_codes SET reserved_ref = ?, reserved_at = ? WHERE code = ? AND used_at IS NULL", args: [ref, Date.now(), code.trim().toUpperCase()] });
}

/** Se llama cuando Wompi confirma el pago: el crédito queda gastado. */
export async function consumeCredit(code: string, ref: string): Promise<void> {
  if (!code) return;
  const db = await getDb();
  await db.execute({ sql: "UPDATE credit_codes SET used_at = ?, used_ref = ? WHERE code = ? AND used_at IS NULL", args: [Date.now(), ref, code.trim().toUpperCase()] });
}
