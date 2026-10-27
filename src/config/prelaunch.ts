// Página "Próximamente" (candado del sitio). Se activa con la variable de entorno SITE_LOCKED=1 en Vercel
// (y se apaga quitándola); ver README, sección "Candado del sitio".
export const prelaunch = {
  // Cuenta regresiva de la página (hora de Colombia, UTC-5): el contador va de "start" a "target".
  countdown: {
    start: "2026-10-27T18:00:00-05:00",
    target: "2026-10-28T00:00:00-05:00",
  },
  // Pares de la subasta exclusiva (ya terminó; el número lo siguen usando /subasta y el admin).
  auctionPairs: 10,
  // Lo que se ofrece por dejar el correo.
  perks: [
    "Entras primero cuando abramos la nueva Pitsneakers",
    "Te avisamos por correo apenas esté abierta",
    "Te enteras antes que nadie de los lanzamientos y la trivia",
  ],
};
