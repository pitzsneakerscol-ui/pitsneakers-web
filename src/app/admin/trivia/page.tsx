import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { ensureWeeklyGame, finalizeGame, triviaNow } from "@/lib/trivia";
import { endsAt, phaseAt } from "@/lib/trivia-shared";
import { formatWhen, toLocalInput } from "@/lib/auction-shared";
import { formatPrice } from "@/lib/format";
import { isEmailConfigured } from "@/lib/email";
import { siteConfig } from "@/config/site";
import { btnGhost, cardCls } from "@/components/reseller/ui";
import { AnnounceTriviaForm, GameForm, LaunchNowForm, QuestionForm } from "@/components/admin/TriviaForms";
import { deleteGame, deleteQuestion } from "@/app/admin/trivia/actions";

export const metadata: Metadata = { title: "Trivia" };

export default async function TriviaAdminPage({ searchParams }: { searchParams: Promise<{ juego?: string; nuevo?: string }> }) {
  const { juego, nuevo } = await searchParams;
  await ensureWeeklyGame();
  const db = await getDb();
  const games = (await db.execute("SELECT g.*, (SELECT COUNT(*) FROM trivia_questions q WHERE q.game_id = g.id) AS nq FROM trivia_games g ORDER BY g.starts_at DESC")).rows;
  const sel = nuevo ? null : games.find((g) => String(g.id) === juego) ?? games[0] ?? null;
  const now = triviaNow();

  let questions: { id: number; text: string; options: string[]; correct: number }[] = [];
  let players = 0;
  let winners: { email: string; code: string; used: boolean }[] = [];
  let ranking: { email: string; correct: number; ms: number; answered: number }[] = [];
  const loadWinners = async (gameId: number) => {
    const w = await db.execute({ sql: "SELECT c.code, c.used_at, w.email FROM credit_codes c JOIN waitlist w ON w.id = c.waitlist_id WHERE c.game_id = ? ORDER BY c.id", args: [gameId] });
    return w.rows.map((x) => ({ email: String(x.email), code: String(x.code), used: x.used_at !== null }));
  };
  if (sel) {
    const q = await db.execute({ sql: "SELECT id, text, options, correct FROM trivia_questions WHERE game_id = ? ORDER BY position, id", args: [Number(sel.id)] });
    questions = q.rows.map((x) => ({ id: Number(x.id), text: String(x.text), options: JSON.parse(String(x.options)) as string[], correct: Number(x.correct) }));
    players = Number((await db.execute({ sql: "SELECT COUNT(DISTINCT waitlist_id) AS n FROM trivia_answers WHERE game_id = ?", args: [Number(sel.id)] })).rows[0].n);
    // Si el juego ya terminó pero nadie lo cerró (los ganadores se calculan cuando un jugador ve el final), se cierra aquí.
    if (Number(sel.finalized) === 0 && questions.length > 0 && now >= endsAt({ startsAt: Number(sel.starts_at), seconds: Number(sel.seconds), gap: Number(sel.gap), total: questions.length })) {
      await finalizeGame(Number(sel.id));
    }
    winners = await loadWinners(Number(sel.id));
    const rk = await db.execute({
      sql: `SELECT w.email AS email, SUM(a.correct) AS c, SUM(a.ms) AS t, COUNT(*) AS n FROM trivia_answers a JOIN waitlist w ON w.id = a.waitlist_id
            WHERE a.game_id = ? GROUP BY a.waitlist_id ORDER BY c DESC, t ASC`,
      args: [Number(sel.id)],
    });
    ranking = rk.rows.map((x) => ({ email: String(x.email), correct: Number(x.c), ms: Number(x.t), answered: Number(x.n) }));
  }
  const pendingAnnounce = sel ? Number((await db.execute({ sql: "SELECT COUNT(*) AS n FROM waitlist WHERE trivia_announced != ?", args: [Number(sel.id)] })).rows[0].n) : 0;

  const timing = sel ? { startsAt: Number(sel.starts_at), seconds: Number(sel.seconds), gap: Number(sel.gap), total: questions.length } : null;
  const phase = timing && questions.length ? phaseAt(timing, now).phase : null;
  const started = sel ? Number(sel.starts_at) <= now : false;
  const base = siteConfig.siteUrl.replace(/\/$/, "");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Trivia en vivo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Los inscritos con pase juegan en <a className="underline" href={`${base}/trivia`} target="_blank" rel="noreferrer">{base}/trivia</a>. Todas las preguntas salen a la misma hora, con cuenta regresiva. Los mejores ganan crédito para comprar.
          </p>
        </div>
        <Link href="/admin/trivia?nuevo=1" className={btnGhost}>+ Nuevo juego</Link>
      </header>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="mb-1 font-display text-2xl tracking-wide">⚡ Lanzar una trivia ahora</h2>
        <p className="mb-4 text-sm text-muted">Crea un juego que empieza en unos minutos con preguntas al azar del banco (premio y reglas como la trivia semanal). Después, entra al juego y pulsa “Avisar a la lista”.</p>
        <LaunchNowForm />
      </section>

      {games.length > 1 && (
        <nav aria-label="Juegos" className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
          {games.map((g) => (
            <Link key={String(g.id)} href={`/admin/trivia?juego=${g.id}`} className={`rounded-full px-4 py-2 ${sel && Number(sel.id) === Number(g.id) ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>
              {String(g.title)}
            </Link>
          ))}
        </nav>
      )}

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="mb-4 font-display text-2xl tracking-wide">1. El juego</h2>
        <GameForm
          key={sel ? String(sel.id) : "nuevo"}
          g={{
            id: sel ? Number(sel.id) : undefined,
            title: sel ? String(sel.title) : "Trivia Pitsneakers",
            starts: toLocalInput(sel ? Number(sel.starts_at) : now + 3 * 86_400_000),
            seconds: sel ? Number(sel.seconds) : 15,
            gap: sel ? Number(sel.gap) : 6,
            prize: sel ? Number(sel.prize) : 10000,
            maxWinners: sel ? Number(sel.max_winners) : 10,
            minCorrect: sel ? Number(sel.min_correct) : 0,
            published: sel ? Number(sel.published) === 1 : false,
          }}
        />
        {sel && (
          <p className="mt-3 text-xs text-muted">
            {started ? (phase === "ended" || (timing && endsAt(timing) <= now) ? "Terminó" : "En curso / ya empezó") : `Empieza ${formatWhen(Number(sel.starts_at))}`} · {players} {players === 1 ? "jugador" : "jugadores"}
            {Number(sel.finalized) === 1 ? " · premios repartidos" : ""}
          </p>
        )}
      </section>

      {sel && (
        <>
          <section className={`${cardCls} p-5 sm:p-6`}>
            <h2 className="mb-4 font-display text-2xl tracking-wide">2. Preguntas ({questions.length})</h2>
            {questions.length > 0 && (
              <ol className="mb-6 space-y-3">
                {questions.map((q, i) => (
                  <li key={q.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{i + 1}. {q.text}</p>
                      {!started && (
                        <form action={deleteQuestion}>
                          <input type="hidden" name="id" value={q.id} />
                          <button type="submit" className="text-xs font-semibold uppercase tracking-wide text-muted underline underline-offset-4 hover:text-accent">Quitar</button>
                        </form>
                      )}
                    </div>
                    <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                      {q.options.map((o, oi) => (
                        <li key={oi} className={oi === q.correct ? "font-semibold text-emerald-700" : "text-muted"}>{oi === q.correct ? "✓ " : "· "}{o}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
            {started ? <p className="text-sm text-muted">El juego ya empezó: las preguntas no se pueden cambiar.</p> : <QuestionForm gameId={Number(sel.id)} />}
          </section>

          {!started && (
            <section className={`${cardCls} p-5 sm:p-6`}>
              <h2 className="mb-1 font-display text-2xl tracking-wide">3. Avisar a la lista</h2>
              <p className="mb-4 text-sm text-muted">Les llega un correo con la fecha, la hora y el premio. {isEmailConfigured() ? "" : "El envío de correos no está configurado."}</p>
              <AnnounceTriviaForm gameId={Number(sel.id)} pendingCount={pendingAnnounce} />
            </section>
          )}

          {phase === "ended" && winners.length === 0 && (
            <section className={`${cardCls} p-5 sm:p-6`}>
              <h2 className="mb-1 font-display text-2xl tracking-wide">Ganadores</h2>
              <p className="text-sm text-muted">
                Nadie alcanzó el mínimo de <strong className="text-ink">{Number(sel.min_correct) > 0 ? Number(sel.min_correct) : questions.length} aciertos</strong> de {questions.length}.
                {ranking.length > 0 ? " Abajo ves cuántos acertó cada jugador." : " Nadie respondió preguntas en este juego."}
              </p>
            </section>
          )}

          {winners.length > 0 && (
            <section className={`${cardCls} overflow-x-auto p-5 sm:p-6`}>
              <h2 className="mb-3 font-display text-2xl tracking-wide">Ganadores ({winners.length}) · {formatPrice(Number(sel.prize))} c/u</h2>
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted">
                  <tr><th className="py-2 pr-3 font-semibold">Correo</th><th className="px-3 py-2 font-semibold">Código</th><th className="px-3 py-2 font-semibold">Estado</th></tr>
                </thead>
                <tbody>
                  {winners.map((w) => (
                    <tr key={w.code} className="border-t border-line">
                      <td className="py-2 pr-3">{w.email}</td>
                      <td className="px-3 py-2 font-mono text-xs">{w.code}</td>
                      <td className="px-3 py-2 text-muted">{w.used ? "Usado" : "Sin usar"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {started && ranking.length > 0 && (
            <section className={`${cardCls} overflow-x-auto p-5 sm:p-6`}>
              <h2 className="mb-1 font-display text-2xl tracking-wide">Resultados ({ranking.length} jugadores)</h2>
              <p className="mb-3 text-sm text-muted">Ordenados por aciertos y, si empatan, por rapidez. Para ganar hacían falta {Number(sel.min_correct) > 0 ? Number(sel.min_correct) : questions.length} aciertos{Number(sel.max_winners) > 0 ? ` (máximo ${Number(sel.max_winners)} ganadores)` : ""}.</p>
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted">
                  <tr><th className="py-2 pr-3 font-semibold">#</th><th className="px-3 py-2 font-semibold">Correo</th><th className="px-3 py-2 font-semibold">Aciertos</th><th className="px-3 py-2 font-semibold">Tiempo</th><th className="px-3 py-2 font-semibold">Resultado</th></tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => {
                    const won = winners.some((w) => w.email === r.email);
                    return (
                      <tr key={r.email} className="border-t border-line">
                        <td className="py-2 pr-3 text-muted">{i + 1}</td>
                        <td className="px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2 tabular-nums">{r.correct}/{questions.length}</td>
                        <td className="px-3 py-2 tabular-nums text-muted">{(r.ms / 1000).toFixed(1)} s</td>
                        <td className={`px-3 py-2 ${won ? "font-semibold text-emerald-700" : "text-muted"}`}>{won ? "🏆 Ganó" : phase === "ended" ? "No ganó" : "Jugando"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {!started && (
            <form action={deleteGame}>
              <input type="hidden" name="id" value={Number(sel.id)} />
              <button type="submit" className="text-xs font-semibold uppercase tracking-wide text-muted underline underline-offset-4 hover:text-accent">Eliminar este juego</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
