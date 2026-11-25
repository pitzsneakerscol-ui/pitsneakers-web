/** Reglas de los pares usados que comparten el formulario del vendedor y el servidor. */

export const USED_MIN_PHOTOS = 3;
export const USED_MAX_PHOTOS = 6;

/** Qué fotos pedimos (en este orden), para que el dueño pueda juzgar el estado real del par. */
export const USED_PHOTO_GUIDE = ["De lado (el perfil completo)", "La suela", "El talón y la parte de atrás", "La puntera y la lengüeta", "Defectos o desgaste, de cerca"];

/** Estado del par que declara el vendedor. */
export const USED_WEAR = [
  { key: "9", label: "9/10 · Casi nuevo", hint: "Sin marcas visibles, usado muy poco" },
  { key: "8", label: "8/10 · Muy bueno", hint: "Desgaste leve en suela o arrugas suaves" },
  { key: "7", label: "7/10 · Bueno", hint: "Se nota el uso, sin daños" },
  { key: "6", label: "6/10 · Con desgaste", hint: "Desgaste marcado o detalles visibles" },
] as const;

/** Las notas de un par usado empiezan con una frase fija con el estado, que la web reutiliza en la descripción. */
export function usedNoteLead(wear: string, box: boolean): string {
  const w = USED_WEAR.find((x) => x.key === wear) ?? USED_WEAR[1];
  return `Usado — estado ${w.key}/10${box ? " — con caja original" : " — sin caja"}.`;
}

/** Saca esa frase de las notas ("Usado — estado 8/10 — con caja original.") o null si el par no la trae. */
export function usedNoteSummary(notes: string): string | null {
  const m = notes.match(/^Usado — estado \d+\/10 — (?:con|sin) caja(?: original)?\./);
  return m ? m[0] : null;
}
