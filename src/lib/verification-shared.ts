/** Verificación del par cuando llega al punto de verificación. Sin dependencias del servidor: la usan el admin, la página del pedido y los correos. */

export const VERIF_CHECKS = [
  { key: "autentico", label: "Autenticidad verificada", hint: "Pits Enigma Verification Process" },
  { key: "caja", label: "Caja original en buen estado", hint: "o la que se publicó" },
  { key: "estado", label: "Estado igual al publicado", hint: "sin daños ni desgaste no declarado" },
  { key: "talla", label: "Talla correcta", hint: "la del pedido, en la etiqueta y en el par" },
  { key: "limpio", label: "Limpio y sin olores", hint: "listo para entregar" },
  { key: "empacado", label: "Empacado con protección", hint: "caja de envío, relleno y sello" },
] as const;

export type VerifKey = (typeof VERIF_CHECKS)[number]["key"];

const KEYS = new Set<string>(VERIF_CHECKS.map((c) => c.key));

/** "autentico,caja" → claves válidas, sin repetir y en el orden de la lista. */
export function parseChecks(raw: string): VerifKey[] {
  const set = new Set(raw.split(",").map((s) => s.trim()).filter((s) => KEYS.has(s)));
  return VERIF_CHECKS.map((c) => c.key).filter((k) => set.has(k));
}

/** Puntos que no se pueden saltar para dar un par por verificado. */
export const REQUIRED_CHECKS: VerifKey[] = ["autentico", "estado", "talla"];

export const isVerified = (checks: readonly string[]) => REQUIRED_CHECKS.every((k) => checks.includes(k));

/** Máximo de fotos de recepción por pedido y peso máximo de cada una (ya reducida en el navegador). */
export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 700_000;
