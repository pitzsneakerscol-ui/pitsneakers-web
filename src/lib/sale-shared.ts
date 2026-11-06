/** Aviso manual al cliente (venta cerrada por WhatsApp): opciones del formulario del admin. Sin dependencias del servidor. */

/** Tipo de mensaje que se le manda al cliente; cada uno deja el pedido en el paso que corresponde. */
export const MESSAGE_TYPES = [
  ["confirmada", "Compra confirmada"],
  ["en_camino", "Tu par va en camino a verificación"],
  ["recibido", "Recibimos tu par"],
  ["verificado", "Tu par fue verificado"],
  ["despachado", "Tu pedido fue despachado (con guía)"],
  ["entregado", "Tu pedido fue entregado"],
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number][0];

export const isMessageType = (v: string): v is MessageType => MESSAGE_TYPES.some(([k]) => k === v);

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

/** Cookie que recuerda que el visitante ya dejó su correo para entrar a Black Friday (un año). */
export const BF_COOKIE = "pit_bf";
