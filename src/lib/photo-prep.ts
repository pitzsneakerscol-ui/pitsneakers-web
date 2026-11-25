import "server-only";
import sharp from "sharp";

/**
 * Deja una foto de producto como las del catálogo: sin fondo, del mismo tamaño que las demás y con la punta hacia la derecha.
 * Es la misma receta de scripts/procesar-fotos.mjs, para poder usarla desde el panel sin pasar por el computador.
 */

// Tamaño común: lienzo cuadrado; el producto se escala para caber en la caja y se centra.
const LIENZO = 2000;
const CAJA_W = 1700;
const CAJA_H = 1500;
const MAX_AMPLIAR = 4;
const UMBRAL_BLANCO = 247;
// "Peso visual": raíz del área que ocupa el producto. Hace que un zapato plano y una bota alta se vean del mismo tamaño.
const PESO_VISUAL = 925;
const AJUSTE_PESO = 0.15;
/** Lado máximo con que se trabaja la foto que llega (las del celular vienen de 4000 px o más). */
const MAX_ENTRADA = 2200;
const THUMB = 640;

interface Cut {
  rgba: Buffer;
  w: number;
  h: number;
  /** Qué se hizo con el fondo. */
  background: "blanco" | "degradado" | "transparente" | "conservado";
}

export interface PreparedPhoto {
  /** Foto final (WebP, lienzo cuadrado transparente). */
  full: Buffer;
  /** Miniatura para las tarjetas. */
  thumb: Buffer;
  background: Cut["background"];
  /** Hacia dónde miraba el zapato en la foto original, según su silueta; "dudosa" si no se pudo saber. */
  facing: "derecha" | "izquierda" | "dudosa";
  /** Si la foto final quedó volteada respecto a la original. */
  flipped: boolean;
}

const neighbors = (i: number, w: number, n: number): number[] => {
  const x = i % w;
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < w - 1) out.push(i + 1);
  if (i >= w) out.push(i - w);
  if (i < n - w) out.push(i + w);
  return out;
};

async function withAlpha(px: Uint8Array, bg: Uint8Array, w: number, h: number): Promise<Buffer> {
  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = bg[i] ? 0 : 255;
  const soft = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(1.1).raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = px[i * 4];
    rgba[i * 4 + 1] = px[i * 4 + 1];
    rgba[i * 4 + 2] = px[i * 4 + 2];
    rgba[i * 4 + 3] = soft.data[i * soft.info.channels];
  }
  return rgba;
}

/**
 * Fondo que no es blanco puro (pared gris, degradado de estudio): se inunda desde los bordes mientras el color cambie poco de un
 * píxel al siguiente y se detiene en el contorno del producto. Devuelve null si el resultado no es creíble.
 */
async function cutGradient(px: Uint8Array, w: number, h: number): Promise<Cut | null> {
  const n = w * h;
  const dist = (i: number, j: number) => Math.max(Math.abs(px[i * 4] - px[j * 4]), Math.abs(px[i * 4 + 1] - px[j * 4 + 1]), Math.abs(px[i * 4 + 2] - px[j * 4 + 2]));
  // Varios "pasos" (cambio de color tolerado entre vecinos): muy bajo deja motas, muy alto se come el producto.
  for (const step of [2, 1, 3]) {
    const bg = new Uint8Array(n);
    const stack = new Int32Array(n);
    let sp = 0;
    const seed = (i: number) => {
      if (!bg[i]) {
        bg[i] = 1;
        stack[sp++] = i;
      }
    };
    for (let x = 0; x < w; x++) {
      seed(x);
      seed((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      seed(y * w);
      seed(y * w + w - 1);
    }
    while (sp > 0) {
      const i = stack[--sp];
      for (const v of neighbors(i, w, n)) {
        if (!bg[v] && dist(i, v) <= step) {
          bg[v] = 1;
          stack[sp++] = v;
        }
      }
    }
    // Quita motas sueltas: se conservan solo las piezas grandes del producto.
    const comp = new Int32Array(n).fill(-1);
    const sizes: number[] = [];
    for (let s0 = 0; s0 < n; s0++) {
      if (bg[s0] || comp[s0] >= 0) continue;
      const id = sizes.length;
      let count = 0;
      const st = [s0];
      comp[s0] = id;
      while (st.length) {
        const i = st.pop() as number;
        count++;
        for (const v of neighbors(i, w, n)) {
          if (!bg[v] && comp[v] < 0) {
            comp[v] = id;
            st.push(v);
          }
        }
      }
      sizes.push(count);
    }
    if (!sizes.length) continue;
    const biggest = sizes.reduce((a, b) => Math.max(a, b), 0);
    const keep = sizes.map((t) => t >= biggest * 0.15 || t >= n * 0.01);
    let fg = 0;
    for (let i = 0; i < n; i++) {
      if (!bg[i] && !keep[comp[i]]) bg[i] = 1;
      if (!bg[i]) fg++;
    }
    const fraction = fg / n;
    if (fraction < 0.06 || fraction > 0.7) continue; // no se separó bien con este paso
    return { rgba: await withAlpha(px, bg, w, h), w, h, background: "degradado" };
  }
  return null;
}

async function cutBackground(input: Buffer): Promise<Cut> {
  // rotate() endereza la foto según como la tomó el celular.
  const base = sharp(input, { failOn: "none" }).rotate().resize({ width: MAX_ENTRADA, height: MAX_ENTRADA, fit: "inside", withoutEnlargement: true });
  const meta = await sharp(input, { failOn: "none" }).metadata();
  const { data, info } = await base.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const n = w * h;
  const px = new Uint8Array(data);
  if (meta.hasAlpha) {
    // Si ya tiene transparencia real, se respeta.
    let clear = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 250) clear++;
    if (clear / n > 0.05) return { rgba: Buffer.from(px), w, h, background: "transparente" };
  }
  const white = (i: number) => px[i * 4] >= UMBRAL_BLANCO && px[i * 4 + 1] >= UMBRAL_BLANCO && px[i * 4 + 2] >= UMBRAL_BLANCO;
  // ¿El borde de la foto es blanco? Si no (pared gris, foto de estudio con degradado), se prueba el otro método.
  let edgeWhite = 0;
  let edgeTotal = 0;
  for (let x = 0; x < w; x++) {
    edgeTotal += 2;
    if (white(x)) edgeWhite++;
    if (white((h - 1) * w + x)) edgeWhite++;
  }
  for (let y = 0; y < h; y++) {
    edgeTotal += 2;
    if (white(y * w)) edgeWhite++;
    if (white(y * w + w - 1)) edgeWhite++;
  }
  if (edgeWhite / edgeTotal < 0.6) return (await cutGradient(px, w, h)) ?? { rgba: Buffer.from(px), w, h, background: "conservado" };

  const bg = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const push = (i: number) => {
    if (!bg[i] && white(i)) {
      bg[i] = 1;
      stack[sp++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  // Producto oscuro: la sombra clara y poco saturada pegada al fondo también es fondo, y el blanco puro encerrado (entre cordones o asas) también.
  let lumSum = 0;
  let lumN = 0;
  for (let i = 0; i < n; i += 7) {
    if (bg[i]) continue;
    lumSum += (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
    lumN++;
  }
  if (lumN > 0 && lumSum / lumN < 100) {
    const pale = (i: number) => {
      const r = px[i * 4];
      const g = px[i * 4 + 1];
      const b = px[i * 4 + 2];
      return Math.min(r, g, b) >= 200 && Math.max(r, g, b) - Math.min(r, g, b) <= 16;
    };
    const frontier: number[] = [];
    for (let i = 0; i < n; i++) if (bg[i] && neighbors(i, w, n).some((v) => !bg[v])) frontier.push(i);
    while (frontier.length) {
      const i = frontier.pop() as number;
      for (const v of neighbors(i, w, n)) {
        if (!bg[v] && pale(v)) {
          bg[v] = 1;
          frontier.push(v);
        }
      }
    }
    const seen = new Uint8Array(n);
    const pure = (i: number) => px[i * 4] >= 253 && px[i * 4 + 1] >= 253 && px[i * 4 + 2] >= 253;
    for (let s0 = 0; s0 < n; s0++) {
      if (bg[s0] || seen[s0] || !pure(s0)) continue;
      const comp = [s0];
      seen[s0] = 1;
      for (let k = 0; k < comp.length; k++) {
        for (const v of neighbors(comp[k], w, n)) {
          if (!seen[v] && !bg[v] && pure(v)) {
            seen[v] = 1;
            comp.push(v);
          }
        }
      }
      if (comp.length > 2500) for (const i of comp) bg[i] = 1;
    }
  }
  return { rgba: await withAlpha(px, bg, w, h), w, h, background: "blanco" };
}

/**
 * Hacia dónde mira un zapato de perfil: el talón (con el cuello) es más alto que la punta. Compara la altura de la silueta en el
 * tercio izquierdo y en el derecho. No sirve para chanclas ni zuecos (sin talón): ahí devuelve "dudosa".
 */
function facingOf(rgba: Buffer, w: number, h: number, box: { x0: number; y0: number; x1: number; y1: number }): PreparedPhoto["facing"] {
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  if (bw / bh > 2.2 || bw / bh < 1.05) return "dudosa";
  const top: number[] = [];
  for (let x = box.x0; x <= box.x1; x++) {
    let t = -1;
    for (let y = box.y0; y <= box.y1; y++) {
      if (rgba[(y * w + x) * 4 + 3] > 40) {
        t = y;
        break;
      }
    }
    top.push(t < 0 ? 0 : (box.y1 - t + 1) / bh);
  }
  const third = Math.max(1, Math.floor(bw * 0.3));
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const diff = mean(top.slice(0, third)) - mean(top.slice(-third));
  if (Math.abs(diff) < 0.06) return "dudosa";
  return diff > 0 ? "derecha" : "izquierda";
}

/**
 * Prepara una foto. `flip`: "auto" la voltea solo si la silueta dice con claridad que mira a la izquierda; true/false lo decide quien llama.
 * `weigh`: aplica el peso visual (solo pares; la ropa tiene formas muy distintas).
 */
export async function preparePhoto(input: Buffer, opts: { flip?: "auto" | boolean; weigh?: boolean } = {}): Promise<PreparedPhoto> {
  const cut = await cutBackground(input);
  const { rgba, w, h } = cut;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  let area = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = rgba[(y * w + x) * 4 + 3];
      if (a > 12) {
        area += a / 255;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("La foto quedó vacía: no se distingue el producto del fondo.");
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const facing = cut.background === "conservado" ? "dudosa" : facingOf(rgba, w, h, { x0, y0, x1, y1 });
  const flipped = opts.flip === true || ((opts.flip ?? "auto") === "auto" && facing === "izquierda");

  // Escala base: lo que cabe en la caja. Luego se acerca al peso visual común sin salirse del lienzo.
  const base = Math.min(CAJA_W / bw, CAJA_H / bh, MAX_AMPLIAR);
  const wanted = PESO_VISUAL / Math.sqrt(area);
  const cap = Math.min(1800 / bw, 1500 / bh, MAX_AMPLIAR);
  const scale = opts.weigh === false ? base : Math.min(cap, Math.max(base * (1 - AJUSTE_PESO), Math.min(base * (1 + AJUSTE_PESO), wanted)));
  const tw = Math.max(1, Math.round(bw * scale));
  const th = Math.max(1, Math.round(bh * scale));
  let piece = sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract({ left: x0, top: y0, width: bw, height: bh }).resize(tw, th, { kernel: "lanczos3" });
  if (flipped) piece = piece.flop();
  const full = await sharp({ create: { width: LIENZO, height: LIENZO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await piece.png().toBuffer(), left: Math.round((LIENZO - tw) / 2), top: Math.round((LIENZO - th) / 2) }])
    .webp({ quality: 90 })
    .toBuffer();
  const thumb = await sharp(full).resize({ width: THUMB, withoutEnlargement: true }).webp({ quality: 72, alphaQuality: 80, effort: 6 }).toBuffer();
  return { full, thumb, background: cut.background, facing, flipped };
}

/** Voltea una foto ya preparada (y rehace su miniatura). */
export async function flipPrepared(full: Buffer): Promise<{ full: Buffer; thumb: Buffer }> {
  const flippedFull = await sharp(full).flop().webp({ quality: 90 }).toBuffer();
  const thumb = await sharp(flippedFull).resize({ width: THUMB, withoutEnlargement: true }).webp({ quality: 72, alphaQuality: 80, effort: 6 }).toBuffer();
  return { full: flippedFull, thumb };
}
