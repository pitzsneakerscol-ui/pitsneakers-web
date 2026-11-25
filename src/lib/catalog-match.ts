/**
 * Empareja lo que un revendedor escribió a mano (marca, modelo, colorway y código) con un modelo del catálogo.
 * Sin dependencias: lo usan la sincronización del catálogo, la carga de pares asignados y las pruebas.
 *
 * Dos niveles:
 *  - resolveModel: emparejamiento seguro, se aplica solo. Mismo código de estilo, o mismas palabras (con las equivalencias
 *    de abajo), o al modelo del catálogo le sobra una sola palabra y no hay otro candidato.
 *  - suggestModels: parecidos (errores de tipeo, palabras de más o de menos). Nunca se aplican solos: el dueño confirma.
 */

export interface MatchModel {
  /** Identificador del modelo (slug del grupo). */
  slug: string;
  brand: string;
  name: string;
  colorway?: string;
  /** Códigos de estilo del fabricante de sus pares, si se conocen. */
  codes?: string[];
}

export interface MatchItem {
  brand: string;
  name: string;
  colorway?: string;
  /** Lo que el revendedor puso en "código": suele ser el código de estilo del fabricante. */
  sku?: string;
}

const plain = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
export const looseKey = (v: string) => plain(v).replace(/[^a-z0-9]+/g, "");

/** Nombre completo de un par: muchos revendedores escriben el modelo en "nombre" y el resto en "colorway" ("Dunk Low" + "Splash Volt"). */
export function fullTitle(name: string, colorway?: string): string {
  const n = name.trim();
  const c = (colorway ?? "").trim();
  return c && !looseKey(n).includes(looseKey(c)) ? `${n} ${c}` : n;
}

/** Marcas que no distinguen un modelo de otro: sobran en el nombre. "Jordan" y "Yeezy" sí son parte del nombre del modelo. */
const NOISE = new Set(["x", "nike", "adidas", "wmns", "gs"]);

/** Palabras de un nombre, ya con las equivalencias que usan los revendedores (AF1 = Air Force 1, AJ1 = Jordan 1, Mind M001 = Mind 001…). */
export function titleTokens(text: string): Set<string> {
  const s = plain(text)
    .replace(/\baf\s*1\b/g, " air force 1 ")
    .replace(/\bair\s+force\s+(one|1)\b/g, " air force 1 ")
    .replace(/\bair\s+jordan\b/g, " jordan ")
    .replace(/\baj\s*(\d{1,2})\b/g, " jordan $1 ")
    .replace(/\byzy\b/g, " yeezy ");
  const out = new Set(
    s
      .split(/[^a-z0-9.]+/)
      .map((w) => w.replace(/^\.+|\.+$/g, "")) // "(OOO)." -> "ooo", pero "2.0" y "plt.af.orm" se conservan
      .filter(Boolean)
  );
  for (const w of NOISE) out.delete(w);
  if (out.has("mind")) {
    for (const w of [...out]) {
      const m = /^m(\d{3})$/.exec(w);
      if (m) {
        out.delete(w);
        out.add(m[1]);
      }
    }
  }
  // Dunk y Air Force 1 se venden casi siempre en "Low": el catálogo y los revendedores lo escriben o no.
  if (out.has("dunk") || (out.has("air") && out.has("force"))) out.delete("low");
  return out;
}

/** Mismas palabras (mínimo 3: "Mind 001" a secas es una familia con varios colorways, no un par concreto). */
const equalSets = (a: Set<string>, b: Set<string>) => a.size >= 3 && a.size === b.size && [...a].every((w) => b.has(w));
/** `model` tiene todas las palabras de `wanted` (mínimo 3, para no confundir nombres cortos como "Dunk Low"). */
const containsAll = (model: Set<string>, wanted: Set<string>) => wanted.size >= 3 && [...wanted].every((w) => model.has(w));

interface Indexed {
  model: MatchModel;
  /** Palabras del nombre, y del nombre con la marca delante. */
  sets: Set<string>[];
  codes: Set<string>;
}

export interface Resolution {
  model: MatchModel;
  how: "codigo" | "nombre" | "nombre+1";
  /** Otros modelos que también contienen el nombre ("Jordan 1 High UNC" está dentro de "Jordan 1 High UNC Toe"). */
  others: MatchModel[];
}

export interface Suggestion {
  model: MatchModel;
  /** 0 a 1. */
  score: number;
}

/** Distancia de edición (con transposición) hasta `max`; devuelve max + 1 si la supera. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length];
}

/** Qué tanto se parecen dos palabras: 1 iguales, menos si es un error de tipeo ("comand" = "command", "lotto" ≈ "lotus"). Los números deben ser iguales. */
function wordLikeness(a: string, b: string): number {
  if (a === b) return 1;
  if (/\d/.test(a) || /\d/.test(b)) return 0;
  const len = Math.min(a.length, b.length);
  if (len < 4) return 0;
  const d = editDistance(a, b, 2);
  if (d === 1) return 0.85;
  if (d === 2 && len >= 5) return 0.6;
  return 0;
}

/**
 * Parecido entre dos nombres, de 0 a 1. Cada palabra pesa según qué tan rara es en el catálogo: coincidir en "jordan 1 low"
 * dice poco, coincidir en "bordeaux" dice mucho.
 */
function likeness(item: Set<string>, model: Set<string>, weight: (w: string) => number, rare: (w: string) => boolean): number {
  if (item.size === 0 || model.size === 0) return 0;
  const free = new Set(model);
  let hitItem = 0;
  let hitModel = 0;
  // Sin ninguna palabra propia del modelo en común ("jordan 1 low" lo tienen cientos) no es un parecido: es la misma familia.
  let distinctive = false;
  for (const w of item) {
    let best = 0;
    let pick = "";
    for (const m of free) {
      const v = wordLikeness(w, m);
      if (v > best) {
        best = v;
        pick = m;
      }
    }
    if (best > 0) {
      hitItem += best * weight(w);
      hitModel += best * weight(pick);
      free.delete(pick);
      if (rare(pick)) distinctive = true;
    }
  }
  if (!distinctive) return 0;
  const total = (set: Set<string>) => [...set].reduce((n, w) => n + weight(w), 0);
  const precision = hitItem / total(item);
  const recall = hitModel / total(model);
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

export interface Matcher {
  resolve(item: MatchItem): Resolution | null;
  suggest(item: MatchItem, limit?: number): Suggestion[];
}

export function createMatcher(models: MatchModel[]): Matcher {
  const index: Indexed[] = models.map((model) => {
    const title = fullTitle(model.name, model.colorway);
    return {
      model,
      sets: [titleTokens(title), titleTokens(`${model.brand} ${title}`)],
      codes: new Set((model.codes ?? []).map(looseKey).filter((c) => c.length >= 5)),
    };
  });

  // Peso de cada palabra: las que salen en pocos modelos pesan más. Una palabra que no está en el catálogo (o mal escrita) pesa lo máximo.
  const seenIn = new Map<string, number>();
  for (const m of index) for (const w of m.sets[0]) seenIn.set(w, (seenIn.get(w) ?? 0) + 1);
  const weight = (w: string) => Math.log(1 + index.length / (seenIn.get(w) ?? 1));
  /** Palabra propia de pocos modelos (como mucho 1 de cada 20). */
  const rare = (w: string) => (seenIn.get(w) ?? 0) <= Math.max(3, index.length / 20);

  const itemSets = (item: MatchItem) => {
    const title = fullTitle(item.name, item.colorway);
    return [titleTokens(title), titleTokens(`${item.brand} ${title}`)];
  };

  function resolve(item: MatchItem): Resolution | null {
    const code = looseKey(item.sku ?? "");
    if (code.length >= 5) {
      const byCode = index.filter((m) => m.codes.has(code));
      if (byCode.length === 1) return { model: byCode[0].model, how: "codigo", others: [] };
    }
    const wanted = itemSets(item);
    const containing = index.filter((m) => m.sets.some((ms) => wanted.some((w) => equalSets(w, ms) || containsAll(ms, w))));
    const exact = containing.filter((m) => m.sets.some((ms) => wanted.some((w) => equalSets(w, ms))));
    if (exact.length === 1) return { model: exact[0].model, how: "nombre", others: containing.filter((m) => m !== exact[0]).map((m) => m.model) };
    if (exact.length > 1) return null;
    // Sin nombre idéntico: un único modelo que contiene el nombre y al que solo le sobra una palabra ("Jellyfish Crystal Sand" = "… Virginia").
    if (containing.length !== 1) return null;
    const m = containing[0];
    const oneExtra = m.sets.some((ms) => wanted.some((w) => containsAll(ms, w) && ms.size - w.size <= 1));
    return oneExtra ? { model: m.model, how: "nombre+1", others: [] } : null;
  }

  function suggest(item: MatchItem, limit = 3): Suggestion[] {
    const wanted = itemSets(item);
    const code = looseKey(item.sku ?? "");
    const out: Suggestion[] = [];
    for (const m of index) {
      let score = 0;
      for (const w of wanted) for (const ms of m.sets) score = Math.max(score, likeness(w, ms, weight, rare));
      if (code.length >= 5 && m.codes.has(code)) score = 1;
      if (score >= 0.52) out.push({ model: m.model, score });
    }
    return out.sort((a, b) => b.score - a.score || a.model.name.length - b.model.name.length).slice(0, limit);
  }

  return { resolve, suggest };
}
