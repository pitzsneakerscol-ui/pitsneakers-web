/** Venta cerrada por WhatsApp: opciones del formulario del admin. Sin dependencias del servidor. */

export const SALE_METHODS = ["Transferencia", "Nequi", "Daviplata", "Efectivo", "Otro"] as const;

export const SALE_STEPS = [
  ["por_preparar", "Por preparar (el par aún no llega)"],
  ["hacia_verificacion", "En camino a verificación"],
  ["preparando", "Verificando y empacando (el par ya está aquí)"],
] as const;

/** Par del catálogo reducido a lo que necesita el buscador del formulario. */
export interface SaleProduct {
  id: string;
  name: string;
  brand: string;
  colorway: string;
  price: number;
  sizes: string[];
  condition: string;
  image: string;
}

export type SaleState = { error?: string };
