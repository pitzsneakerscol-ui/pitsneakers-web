/**
 * Podio del ranking (#1, #2, #3): vendedores reales de la comunidad que atienden por WhatsApp.
 * Su stock no está en la página y no se migra, así que aquí se anotan a mano.
 *
 * - `name`: escríbelo YA TAPADO con x (ej. "sebastixxxzon"); el nombre completo no se guarda en el proyecto.
 * - `total`: pedidos de todo el tiempo. `month`: pedidos del mes en curso (opcional; sin él, no aparece en "Este mes").
 *
 * Mientras un puesto del podio no tenga datos, se muestra bloqueado ("Sin dueño").
 */
export interface PodiumSeller {
  name: string;
  total: number;
  month?: number;
}

export const PODIUM_SELLERS: PodiumSeller[] = [];
