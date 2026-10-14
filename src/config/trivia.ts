// Trivia semanal automática. La página crea sola el juego de cada jueves con preguntas del banco (src/data/trivia-bank.ts).
// Para pausarla sin tocar código: variable de entorno TRIVIA_AUTO=0 en Vercel.
export const weeklyTrivia = {
  /** día de la semana: 0 = domingo … 4 = jueves */
  weekday: 4,
  /** hora de inicio, hora de Colombia (24 h) */
  hour: 11,
  minute: 0,
  title: "Trivia del jueves",
  questions: 10,
  /** segundos que dura cada pregunta abierta */
  seconds: 15,
  /** segundos entre preguntas (se muestra la respuesta) */
  gap: 6,
  /** crédito para quien gane, en pesos */
  prize: 10000,
  /** máximo de ganadores por juego (0 = sin tope) */
  maxWinners: 10,
  /** aciertos mínimos para ganar (0 = todas) */
  minCorrect: 8,
};
