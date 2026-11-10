/**
 * Eventos del Píxel de Meta (navegador). Si no hay ID de píxel configurado, todo esto no hace nada.
 * Los eventos que llegan antes de que cargue el script de Meta quedan en una cola (`__pitq`) que se vacía al iniciar el píxel.
 */
type Fbq = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: Fbq;
    __pitq?: unknown[][] | null;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

/** Manda un evento estándar de Meta. `eventId` sirve para que Meta no cuente dos veces el mismo evento si también llega por el servidor. */
export function trackMeta(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || !META_PIXEL_ID) return;
  const args: unknown[] = ["track", event, params ?? {}];
  if (eventId) args.push({ eventID: eventId });
  if (window.fbq) window.fbq(...args);
  else (window.__pitq ??= []).push(args);
}

/** id del producto en el feed (`g:id`): el SKU con la talla pegada, sin espacios. */
export const feedItemId = (sku: string, size: string) => (size && size !== "Única" ? `${sku}-${size}`.replace(/\s+/g, "") : sku);

/** Datos del producto en el formato que pide Meta; el id es el del grupo, igual que `g:item_group_id` en el feed. */
export function productParams(p: { slug: string; name: string; value: number; category?: string }) {
  return {
    content_ids: [p.slug],
    content_type: "product_group",
    content_name: p.name.replace(/^(\S+) \1 /, "$1 "),
    content_category: p.category,
    value: p.value,
    currency: "COP",
  };
}
