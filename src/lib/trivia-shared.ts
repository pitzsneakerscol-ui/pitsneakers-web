// Tiempos y tipos de la trivia en vivo. Los usan el navegador (cuenta regresiva) y el servidor (decisión final).

export interface GameTiming {
  startsAt: number;
  /** segundos que dura cada pregunta abierta */
  seconds: number;
  /** segundos entre preguntas (se muestra la respuesta correcta) */
  gap: number;
  total: number;
}

export type Phase = "lobby" | "open" | "reveal" | "ended";

export interface PhaseInfo {
  phase: Phase;
  /** pregunta actual (0, 1, 2…); -1 en la sala de espera */
  index: number;
  /** momento (ms) en que cambia la fase; null cuando el juego terminó */
  until: number | null;
}

export const slotMs = (g: GameTiming): number => (g.seconds + g.gap) * 1000;
export const openAt = (g: GameTiming, index: number): number => g.startsAt + index * slotMs(g);
export const endsAt = (g: GameTiming): number => g.startsAt + g.total * slotMs(g);

/** En qué fase está el juego a una hora dada: espera → pregunta abierta → respuesta → siguiente… → terminado. */
export function phaseAt(g: GameTiming, now: number): PhaseInfo {
  if (now < g.startsAt) return { phase: "lobby", index: -1, until: g.startsAt };
  const t = now - g.startsAt;
  const i = Math.floor(t / slotMs(g));
  if (i >= g.total) return { phase: "ended", index: g.total - 1, until: null };
  const within = t - i * slotMs(g);
  if (within < g.seconds * 1000) return { phase: "open", index: i, until: openAt(g, i) + g.seconds * 1000 };
  return { phase: "reveal", index: i, until: openAt(g, i + 1) };
}

export interface TriviaGameView extends GameTiming {
  id: number;
  title: string;
  prize: number;
  maxWinners: number;
}

export interface TriviaQuestionView {
  id: number;
  text: string;
  options: string[];
}

export interface TriviaResult {
  correct: number;
  total: number;
  required: number;
  rank: number | null;
  winner: boolean;
  code: string | null;
  top: { who: string; correct: number; seconds: number }[];
}

export interface TriviaState {
  now: number;
  game: TriviaGameView | null;
  phase: Phase;
  index: number;
  until: number | null;
  question: TriviaQuestionView | null;
  /** mi respuesta a la pregunta actual (null si no he respondido) */
  mine: number | null;
  /** índice de la opción correcta (solo cuando ya se cerró la pregunta) */
  correct: number | null;
  /** aciertos míos en las preguntas ya cerradas */
  score: number;
  result: TriviaResult | null;
}
