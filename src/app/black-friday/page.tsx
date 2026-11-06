// /black-friday es la misma página que /sale (para que el link de la campaña sea fácil de decir y de compartir).
export { default, metadata } from "../sale/page";

// Debe escribirse aquí (Next no lee este valor desde un re-export).
export const revalidate = 300;
