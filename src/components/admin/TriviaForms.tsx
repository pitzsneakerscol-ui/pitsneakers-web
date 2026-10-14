"use client";

import { useActionState } from "react";
import { addQuestion, announceTrivia, launchNow, saveGame } from "@/app/admin/trivia/actions";
import { btnAccent, btnPrimary, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

function Notice({ state }: { state: { ok?: boolean; error?: string; message?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">{state.message}</p>;
  return null;
}

export function GameForm({ g }: { g: { id?: number; title: string; starts: string; seconds: number; gap: number; prize: number; maxWinners: number; minCorrect: number; published: boolean } }) {
  const [state, action, pending] = useActionState(saveGame, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      {g.id ? <input type="hidden" name="id" value={g.id} /> : null}
      <div>
        <label htmlFor="tg-title" className={labelCls}>Título</label>
        <input id="tg-title" name="title" defaultValue={g.title} maxLength={80} className={inputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="tg-start" className={labelCls}>Empieza (hora de Colombia)</label>
          <input id="tg-start" name="starts" type="datetime-local" required defaultValue={g.starts} className={inputCls} />
        </div>
        <div>
          <label htmlFor="tg-sec" className={labelCls}>Segundos por pregunta</label>
          <input id="tg-sec" name="seconds" inputMode="numeric" defaultValue={g.seconds} className={inputCls} />
        </div>
        <div>
          <label htmlFor="tg-gap" className={labelCls}>Segundos entre preguntas</label>
          <input id="tg-gap" name="gap" inputMode="numeric" defaultValue={g.gap} className={inputCls} />
        </div>
        <div>
          <label htmlFor="tg-prize" className={labelCls}>Premio por ganador (COP)</label>
          <input id="tg-prize" name="prize" inputMode="numeric" defaultValue={g.prize} className={inputCls} />
        </div>
        <div>
          <label htmlFor="tg-max" className={labelCls}>Máximo de ganadores (0 = sin tope)</label>
          <input id="tg-max" name="max_winners" inputMode="numeric" defaultValue={g.maxWinners} className={inputCls} />
        </div>
        <div>
          <label htmlFor="tg-min" className={labelCls}>Aciertos mínimos (0 = todas)</label>
          <input id="tg-min" name="min_correct" inputMode="numeric" defaultValue={g.minCorrect} className={inputCls} />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="published" value="1" defaultChecked={g.published} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
        <span><strong>Publicado</strong>: los inscritos con pase ya ven la sala de espera con la cuenta regresiva.</span>
      </label>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Guardando…" : g.id ? "Guardar cambios" : "Crear juego"}</button>
    </form>
  );
}

/** Lanzar una trivia ya: título, en cuántos minutos empieza, cuántas preguntas y segundos por pregunta. Las preguntas salen del banco. */
export function LaunchNowForm() {
  const [state, action, pending] = useActionState(launchNow, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <div>
        <label htmlFor="ln-title" className={labelCls}>Título</label>
        <input id="ln-title" name="title" defaultValue="Trivia relámpago" maxLength={80} className={inputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="ln-min" className={labelCls}>Empieza en (minutos)</label>
          <input id="ln-min" name="minutes" inputMode="numeric" defaultValue={5} className={inputCls} />
        </div>
        <div>
          <label htmlFor="ln-count" className={labelCls}>Preguntas</label>
          <input id="ln-count" name="count" inputMode="numeric" defaultValue={10} className={inputCls} />
        </div>
        <div>
          <label htmlFor="ln-sec" className={labelCls}>Segundos por pregunta</label>
          <input id="ln-sec" name="seconds" inputMode="numeric" defaultValue={15} className={inputCls} />
        </div>
      </div>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={btnAccent}>{pending ? "Creando…" : "⚡ Lanzar trivia"}</button>
    </form>
  );
}

export function QuestionForm({ gameId }: { gameId: number }) {
  const [state, action, pending] = useActionState(addQuestion, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-3">
      <input type="hidden" name="game_id" value={gameId} />
      <div>
        <label htmlFor="tq-text" className={labelCls}>Pregunta</label>
        <input id="tq-text" name="text" required maxLength={200} placeholder="¿En qué año salió el Air Jordan 1?" className={inputCls} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["a", "b", "c", "d"] as const).map((k, i) => (
          <div key={k} className="flex items-center gap-2">
            <input type="radio" name="correct" value={i} required aria-label={`La opción ${k.toUpperCase()} es la correcta`} className="h-4 w-4 accent-[var(--color-accent)]" />
            <input name={`opt_${k}`} required maxLength={80} placeholder={`Opción ${k.toUpperCase()}`} className={inputCls} />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Marca con el círculo la respuesta correcta.</p>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={btnAccent}>{pending ? "Agregando…" : "Agregar pregunta"}</button>
    </form>
  );
}

export function AnnounceTriviaForm({ gameId, pendingCount }: { gameId: number; pendingCount: number }) {
  const [state, action, pending] = useActionState(announceTrivia, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-3">
      <input type="hidden" name="game_id" value={gameId} />
      <Notice state={state} />
      <button type="submit" disabled={pending || pendingCount === 0} className={btnAccent}>
        {pending ? "Enviando… (puede tardar)" : pendingCount === 0 ? "Todos avisados" : `Avisar a la lista (${pendingCount} sin avisar)`}
      </button>
      <p className="text-xs text-muted">Envía de a 40 correos por clic. Pulsa de nuevo hasta que diga “Todos avisados”.</p>
    </form>
  );
}
