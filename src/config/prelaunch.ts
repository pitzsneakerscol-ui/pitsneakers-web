// Página "Próximamente" (candado del sitio). Se activa con la variable de entorno SITE_LOCKED=1 en Vercel
// (y se apaga quitándola); ver README, sección "Candado del sitio".
export const prelaunch = {
  // Incentivo por dejar el correo: cada inscrito recibe un código personal.
  discountPercent: 10,
  perks: [
    "Código personal de descuento en tu primera compra",
    "Acceso anticipado a los pares nuevos, antes de publicarlos",
    "Te avisamos el día exacto del lanzamiento",
  ],
};
