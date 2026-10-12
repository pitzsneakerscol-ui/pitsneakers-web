// Página "Próximamente" (candado del sitio). Se activa con la variable de entorno SITE_LOCKED=1 en Vercel
// (y se apaga quitándola); ver README, sección "Candado del sitio".
export const prelaunch = {
  // Incentivo por dejar el correo: acceso a una subasta exclusiva solo para inscritos.
  auctionPairs: 10,
  perks: [
    "Acceso a una subasta exclusiva de 10 pares que no van a estar en el catálogo",
    "Pase personal: solo los inscritos podrán pujar",
    "Te avisamos por correo el día y la hora de la subasta",
  ],
};
