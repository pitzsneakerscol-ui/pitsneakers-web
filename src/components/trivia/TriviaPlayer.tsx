"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { answerQuestion } from "@/app/trivia/actions";
import { formatPrice } from "@/lib/format";
import { haptic } from "@/lib/native";
import type { TriviaState } from "@/lib/trivia-shared";

const LETTERS = ["A", "B", "C", "D"];

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${pad(m)}m`;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** Trivia en vivo: la pantalla se mueve sola al ritmo del servidor (cuenta regresiva local, consulta solo en cada cambio de fase). */
export default function TriviaPlayer({ initial }: { initial: TriviaState }) {
  const [st, setSt] = useState<TriviaState>(initial);
  const [now, setNow] = useState(initial.now);
  const [picked, setPicked] = useState<number | null>(initial.mine);
  const [err, setErr] = useState<string | null>(null);
  const offset = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/trivia/estado", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as TriviaState;
      offset.current = data.now - Date.now();
      setSt(data);
      setPicked(data.mine);
    } catch {
      /* sin red: se reintenta en el próximo cambio */
    }
  }, []);

  useEffect(() => {
    offset.current = initial.now - Date.now();
    const tick = setInterval(() => setNow(Date.now() + offset.current), 250);
    return () => clearInterval(tick);
  }, [initial.now]);

  // Siguiente consulta: justo cuando cambia la fase (con un poco de aleatoriedad para no pegarle todos al servidor a la vez).
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (st.until === null) return;
    const wait = Math.max(300, st.until - (Date.now() + offset.current)) + 200 + Math.random() * 700;
    timer.current = setTimeout(load, wait);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [st, load]);

  async function pick(i: number) {
    if (!st.question || picked !== null) return;
    setPicked(i);
    setErr(null);
    haptic("light");
    const r = await answerQuestion(st.question.id, i);
    if (!r.ok) {
      setPicked(null);
      setErr(r.error ?? "No se pudo guardar tu respuesta.");
    }
  }

  const g = st.game;
  if (!g) {
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <p className="text-4xl" aria-hidden="true">🎮</p>
        <h1 className="mt-2 font-display text-4xl tracking-wide">Aún no hay trivia</h1>
        <p className="mt-2 text-white/70">Cuando programemos la próxima, te avisamos por correo.</p>
      </div>
    );
  }

  const left = st.until === null ? 0 : st.until - now;
  const card = "mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur sm:p-8";

  if (st.phase === "lobby") {
    return (
      <div className={`${card} mt-8`}>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">🎮 Trivia en vivo</span>
        <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-wide sm:text-6xl">{g.title}</h1>
        <p className="mt-3 text-white/70">{g.total} preguntas · {g.seconds} segundos cada una · gana <strong className="text-white">{formatPrice(g.prize)}</strong> de crédito{g.maxWinners > 0 ? ` (los ${g.maxWinners} mejores)` : ""}.</p>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">Empieza en</p>
        <p className="font-display text-7xl tracking-wide text-accent tabular-nums">{clock(left)}</p>
        <p className="mt-4 text-sm text-white/60">Deja esta pantalla abierta: la primera pregunta aparece sola.</p>
      </div>
    );
  }

  if (st.phase === "ended") {
    const r = st.result;
    return (
      <div className={`${card} mt-8`}>
        <p className="text-5xl" aria-hidden="true">{r?.winner ? "🏆" : "🎯"}</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide">{r?.winner ? "¡Ganaste!" : "Trivia terminada"}</h1>
        {r && (
          <>
            <p className="mt-2 text-white/80">Acertaste <strong className="text-white">{r.correct}</strong> de {r.total}{r.rank ? ` · puesto ${r.rank}` : ""}.</p>
            {r.winner && r.code ? (
              <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-dashed border-accent bg-accent/10 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Tu crédito de {formatPrice(g.prize)}</p>
                <p className="mt-1 font-display text-3xl tracking-[0.15em] text-accent">{r.code}</p>
                <p className="mt-2 text-xs text-white/70">También te llegó por correo. Úsalo en <strong>Comprar ahora</strong> con este mismo correo.</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/60">{r.correct >= r.required ? "Hiciste buen puntaje, pero otros jugadores fueron más rápidos." : `Para ganar había que acertar al menos ${r.required}.`} ¡Estate atento a la próxima!</p>
            )}
            {r.top.length > 0 && (
              <div className="mt-6 text-left">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">Mejores resultados</p>
                <ol className="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10">
                  {r.top.map((t, i) => (
                    <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span><span className="mr-2 text-white/40">{i + 1}.</span>{t.who}</span>
                      <span className="text-white/70">{t.correct}/{r.total} · {t.seconds}s</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const q = st.question;
  const open = st.phase === "open";
  const pct = open && st.until ? Math.max(0, Math.min(100, (left / (g.seconds * 1000)) * 100)) : 0;

  return (
    <div className={`${card} mt-6`}>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
        <span>Pregunta {st.index + 1} de {g.total}</span>
        <span>Aciertos: {st.score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${open ? pct : 0}%` }} />
      </div>
      {open && <p className="mt-2 font-display text-4xl tabular-nums text-accent">{Math.max(0, Math.ceil(left / 1000))}</p>}

      {q ? (
        <>
          <h1 className="mt-4 font-display text-3xl leading-tight tracking-wide sm:text-4xl">{q.text}</h1>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {q.options.map((o, i) => {
              const isMine = picked === i;
              const isRight = st.correct === i;
              const reveal = st.phase === "reveal";
              const cls = reveal
                ? isRight ? "border-emerald-400 bg-emerald-500/20" : isMine ? "border-accent bg-accent/20" : "border-white/10 opacity-60"
                : isMine ? "border-accent bg-accent/20" : "border-white/20 hover:border-white/50";
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={!open || picked !== null}
                    onClick={() => pick(i)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-base font-semibold transition ${cls}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">{LETTERS[i]}</span>
                    <span>{o}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 min-h-6 text-sm text-white/70" role="status">
            {err ? <span className="text-accent">{err}</span> : open ? (picked !== null ? "Respuesta enviada. Espera el resultado…" : "¡Elige rápido!") : picked === null ? "No alcanzaste a responder." : picked === st.correct ? "¡Correcto! 🎉" : "Esta vez no. ¡Sigue!"}
          </p>
          {!open && <p className="text-xs text-white/50">Siguiente pregunta en {Math.max(0, Math.ceil(left / 1000))}…</p>}
        </>
      ) : (
        <p className="mt-6 text-white/70">Cargando la pregunta…</p>
      )}
    </div>
  );
}
