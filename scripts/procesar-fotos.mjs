#!/usr/bin/env node
// Procesa fotos de productos: quita el fondo blanco, las deja del MISMO tamaño y las conecta al catálogo.
//
//   npm run fotos                    procesa lo que haya en la carpeta fotos-nuevas/
//   npm run fotos -- --desde "C:\Users\user\Downloads"   procesa otra carpeta, pero SOLO archivos de la última hora
//   npm run fotos -- --desde "C:\Users\user\Downloads" --ultimas 3   ...de las últimas 3 horas
//   npm run fotos -- --probar        muestra qué haría, sin escribir nada
//   npm run fotos -- --igualar       vuelve a igualar el tamaño de TODAS las fotos que ya están en el catálogo
//
// El nombre del archivo dice de qué producto es: el SKU (AJ4-01.png) o el nombre ("Jordan 4 Brick.png",
// "supreme duffle bag.png"). Para una segunda foto del mismo producto termina el nombre en " 2" (ej. "Gorra Nocta 2.png").

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public", "products");
const CSV = path.join(ROOT, "docs", "inventario-pitsneakers.csv");
const JSON_OUT = path.join(ROOT, "src", "data", "products.json");
const INBOX_DEFAULT = path.join(ROOT, "fotos-nuevas");
const LOG = path.join(ROOT, "fotos-nuevas", ".procesadas.json");

// Tamaño común: lienzo cuadrado; el producto se escala para caber en CAJA_W x CAJA_H y se centra.
const LIENZO = 2000;
const CAJA_W = 1700;
const CAJA_H = 1500;
const MAX_AMPLIAR = 1.8; // no ampliar más de esto para no perder nitidez
const UMBRAL_BLANCO = 247;
const FOTOS_COL = 11;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valor = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const PROBAR = flag("--probar");
const IGUALAR = flag("--igualar");
const INBOX = valor("--desde") ? path.resolve(valor("--desde")) : INBOX_DEFAULT;
// En una carpeta compartida (Descargas) solo se miran archivos recientes, para no volver a tocar fotos de antes.
const HORAS = valor("--ultimas") ? Number(valor("--ultimas")) : INBOX === INBOX_DEFAULT ? null : 1;

/* ---------- utilidades ---------- */

const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (s) => new Set(norm(s).split(" ").filter(Boolean));
const slug = (s) => norm(s).replace(/ /g, "-").toUpperCase();

/** Parte una línea de CSV en campos "crudos" (conserva comillas) respetando comas dentro de comillas. */
function splitCsv(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '""';
        i++;
        continue;
      }
      q = !q;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}
const unquote = (f) => (f.startsWith('"') && f.endsWith('"') ? f.slice(1, -1).replace(/""/g, '"') : f);
const quoteIfNeeded = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function leerCatalogo() {
  const raw = fs.readFileSync(CSV, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const header = splitCsv(lines[0]);
  const productos = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const f = splitCsv(lines[i]);
    if (f.length !== header.length) continue;
    const nombre = unquote(f[0]);
    const marca = unquote(f[1]);
    const sku = unquote(f[2]);
    productos.push({
      line: i,
      nombre,
      marca,
      sku,
      fotos: unquote(f[FOTOS_COL]).split(",").map((s) => s.trim()).filter(Boolean),
      // Nombre de archivo para sus fotos: el SKU, o uno derivado de marca + nombre si no tiene.
      archivo: sku || (slug(nombre).startsWith(slug(marca)) ? slug(nombre) : `${slug(marca)}-${slug(nombre)}`),
      toks: tokens(`${marca} ${nombre}`),
    });
  }
  return { lines, eol, productos };
}

/** Busca a qué producto(s) corresponde un archivo. Devuelve { productos, razon } */
function emparejar(base, productos) {
  const nombre = base;
  const nTok = tokens(nombre);
  const exacto = productos.filter((p) => p.sku && norm(p.sku) === norm(nombre));
  if (exacto.length) return { productos: exacto, razon: "SKU" };
  if (nTok.size === 0) return { productos: [], razon: "sin texto" };
  const puntuados = productos
    .map((p) => {
      const inter = [...nTok].filter((t) => p.toks.has(t)).length;
      const union = new Set([...nTok, ...p.toks]).size;
      const contenido = inter === nTok.size || inter === p.toks.size; // uno incluye al otro
      return { p, score: contenido ? inter / union : 0 };
    })
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score);
  if (!puntuados.length) return { productos: [], razon: "no coincide con ningún producto" };
  const mejor = puntuados[0].score;
  const empatados = puntuados.filter((x) => x.score >= mejor - 0.0001);
  // Varios productos con exactamente el mismo nombre: es el mismo artículo publicado dos veces → misma foto.
  const mismos = new Set(empatados.map((x) => norm(`${x.p.marca} ${x.p.nombre}`)));
  if (mismos.size === 1) return { productos: empatados.map((x) => x.p), razon: "nombre" };
  const siguiente = puntuados.find((x) => x.score < mejor - 0.0001);
  if (empatados.length === 1 && (!siguiente || mejor - siguiente.score >= 0.12)) {
    return { productos: [empatados[0].p], razon: "nombre" };
  }
  return { productos: [], razon: `ambiguo (${empatados.slice(0, 3).map((x) => x.p.nombre).join(" / ")})` };
}

/* ---------- imagen: quitar fondo + igualar tamaño ---------- */

async function quitarFondo(file) {
  const meta = await sharp(file).metadata();
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);
  if (meta.hasAlpha) {
    // Si ya tiene transparencia real, se respeta.
    let transp = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 250) transp++;
    if (transp / (w * h) > 0.05) return { rgba: Buffer.from(px), w, h, conFondo: false };
  }
  const blanco = (i) => px[i * 4] >= UMBRAL_BLANCO && px[i * 4 + 1] >= UMBRAL_BLANCO && px[i * 4 + 2] >= UMBRAL_BLANCO;
  // ¿El borde de la foto es blanco? Si no (pared gris, foto de estudio con degradado), quitar el fondo la dañaría.
  let bordeBlanco = 0;
  let bordeTotal = 0;
  for (let x = 0; x < w; x++) {
    bordeTotal += 2;
    if (blanco(x)) bordeBlanco++;
    if (blanco((h - 1) * w + x)) bordeBlanco++;
  }
  for (let y = 0; y < h; y++) {
    bordeTotal += 2;
    if (blanco(y * w)) bordeBlanco++;
    if (blanco(y * w + w - 1)) bordeBlanco++;
  }
  if (bordeBlanco / bordeTotal < 0.6) return { rgba: Buffer.from(px), w, h, conFondo: "no-blanco" };

  const bg = new Uint8Array(w * h);
  const pila = new Int32Array(w * h);
  let sp = 0;
  const meter = (i) => {
    if (!bg[i] && blanco(i)) {
      bg[i] = 1;
      pila[sp++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    meter(x);
    meter((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    meter(y * w);
    meter(y * w + w - 1);
  }
  while (sp > 0) {
    const i = pila[--sp];
    const x = i % w;
    if (x > 0) meter(i - 1);
    if (x < w - 1) meter(i + 1);
    if (i >= w) meter(i - w);
    if (i < w * h - w) meter(i + w);
  }
  // Producto oscuro (bolsos, gorras negras): el blanco puro que queda encerrado entre asas o rejillas es fondo.
  let lumSum = 0;
  let lumN = 0;
  for (let i = 0; i < w * h; i += 7) {
    if (bg[i]) continue;
    lumSum += (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
    lumN++;
  }
  if (lumN > 0 && lumSum / lumN < 100) {
    const visto = new Uint8Array(w * h);
    const puro = (i) => px[i * 4] >= 253 && px[i * 4 + 1] >= 253 && px[i * 4 + 2] >= 253;
    for (let s0 = 0; s0 < w * h; s0++) {
      if (bg[s0] || visto[s0] || !puro(s0)) continue;
      const comp = [s0];
      visto[s0] = 1;
      for (let k = 0; k < comp.length; k++) {
        const i = comp[k];
        const x = i % w;
        const vecinos = [];
        if (x > 0) vecinos.push(i - 1);
        if (x < w - 1) vecinos.push(i + 1);
        if (i >= w) vecinos.push(i - w);
        if (i < w * h - w) vecinos.push(i + w);
        for (const n of vecinos) {
          if (!visto[n] && !bg[n] && puro(n)) {
            visto[n] = 1;
            comp.push(n);
          }
        }
      }
      if (comp.length > 2500) for (const i of comp) bg[i] = 1;
    }
  }
  const alfa = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alfa[i] = bg[i] ? 0 : 255;
  const suave = await sharp(alfa, { raw: { width: w, height: h, channels: 1 } }).blur(1.1).raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = px[i * 4];
    rgba[i * 4 + 1] = px[i * 4 + 1];
    rgba[i * 4 + 2] = px[i * 4 + 2];
    rgba[i * 4 + 3] = suave.data[i * suave.info.channels];
  }
  return { rgba, w, h, conFondo: true };
}

/** Recorta al producto, lo escala a la caja común y lo centra en el lienzo. Devuelve { webp, info }. */
async function igualarTamano({ rgba, w, h }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (rgba[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) throw new Error("la imagen quedó vacía (¿todo era fondo?)");
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const escala = Math.min(CAJA_W / bw, CAJA_H / bh, MAX_AMPLIAR);
  const tw = Math.max(1, Math.round(bw * escala));
  const th = Math.max(1, Math.round(bh * escala));
  const recorte = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: x0, top: y0, width: bw, height: bh })
    .resize(tw, th, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  const webp = await sharp({ create: { width: LIENZO, height: LIENZO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: recorte, left: Math.round((LIENZO - tw) / 2), top: Math.round((LIENZO - th) / 2) }])
    .webp({ quality: 95 })
    .toBuffer();
  return { webp, info: { original: `${bw}x${bh}`, final: `${tw}x${th}`, escala: +escala.toFixed(2) } };
}

/* ---------- catálogo: CSV + products.json ---------- */

function escribirFotosCsv(catalogo, cambios) {
  for (const [producto, fotos] of cambios) {
    const f = splitCsv(catalogo.lines[producto.line]);
    f[FOTOS_COL] = quoteIfNeeded(fotos.join(","));
    catalogo.lines[producto.line] = f.join(",");
  }
  fs.writeFileSync(CSV, catalogo.lines.join(catalogo.eol));
}

async function regenerarCatalogo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pit-catalogo-"));
  let src = fs.readFileSync(path.join(ROOT, "src", "lib", "sheet-source.ts"), "utf8");
  src = src.replace(/import \{[^}]*\} from "@\/types\/product";/, 'import type { Product, ProductCategory, ProductCondition } from "./types.ts";');
  src = src.replace("function parseCSV(", "export function parseCSV(");
  fs.writeFileSync(path.join(tmp, "sheet-source.ts"), src);
  fs.copyFileSync(path.join(ROOT, "src", "types", "product.ts"), path.join(tmp, "types.ts"));
  const mod = await import(pathToFileURL(path.join(tmp, "sheet-source.ts")).href);
  const productos = mod.rowsToProducts(mod.parseCSV(fs.readFileSync(CSV, "utf8")));
  const previo = fs.readFileSync(JSON_OUT, "utf8");
  const eol = previo.includes("\r\n") ? "\r\n" : "\n";
  const indent = /^\[\s*\n(\s+)\{/.exec(previo.replace(/\r\n/g, "\n"))?.[1] ?? "  ";
  fs.writeFileSync(JSON_OUT, JSON.stringify(productos, null, indent).replace(/\n/g, eol) + eol);
  fs.rmSync(tmp, { recursive: true, force: true });
  return productos;
}

/* ---------- flujo principal ---------- */

const EXT = /\.(png|jpe?g|webp)$/i;

async function modoIgualar() {
  const archivos = fs.readdirSync(PUBLIC).filter((f) => f.endsWith(".webp"));
  let cambiadas = 0;
  for (const f of archivos) {
    const ruta = path.join(PUBLIC, f);
    const meta = await sharp(ruta).metadata();
    if (!meta.hasAlpha) {
      console.log(`  · ${f}: sin transparencia, se deja igual`);
      continue;
    }
    const img = await quitarFondo(ruta);
    const { webp, info } = await igualarTamano(img);
    const cambio = Math.abs(info.escala - 1) > 0.01 || img.w !== LIENZO || img.h !== LIENZO;
    if (!cambio) continue;
    cambiadas++;
    console.log(`  ✓ ${f}: ${info.original} → ${info.final} (x${info.escala})`);
    if (!PROBAR) fs.writeFileSync(ruta, webp);
  }
  console.log(`\n${PROBAR ? "Se igualarían" : "Igualadas"} ${cambiadas} de ${archivos.length} fotos.`);
}

async function modoProcesar() {
  if (!fs.existsSync(INBOX)) {
    fs.mkdirSync(INBOX, { recursive: true });
    console.log(`Creé la carpeta ${INBOX}. Deja ahí las fotos y vuelve a correr el comando.`);
    return;
  }
  const hecho = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {};
  const archivos = fs
    .readdirSync(INBOX)
    .filter((f) => EXT.test(f) && fs.statSync(path.join(INBOX, f)).isFile())
    .filter((f) => HORAS === null || Date.now() - fs.statSync(path.join(INBOX, f)).mtimeMs <= HORAS * 3600 * 1000)
    .sort();
  if (!archivos.length) {
    console.log(`No hay fotos nuevas en ${INBOX}${HORAS === null ? "" : ` (de las últimas ${HORAS} h)`}.`);
    return;
  }

  const catalogo = leerCatalogo();
  const cambios = new Map(); // producto -> fotos finales
  const reporte = { ok: [], sinPareja: [], omitidas: 0 };

  for (const f of archivos) {
    const ruta = path.join(INBOX, f);
    const st = fs.statSync(ruta);
    const clave = `${f}|${st.size}|${Math.round(st.mtimeMs)}`;
    if (hecho[clave]) {
      reporte.omitidas++;
      continue;
    }
    const base = f.replace(EXT, "");
    let { productos, razon } = emparejar(base, catalogo.productos);
    // "Nombre 2" / "Nombre (2)": segunda foto del mismo producto (solo si el nombre completo no coincidía).
    let segunda = false;
    if (!productos.length && /\s*(\(2\)|[-_ ]2)$/.test(base)) {
      const r2 = emparejar(base.replace(/\s*(\(2\)|[-_ ]2)$/, ""), catalogo.productos);
      if (r2.productos.length) {
        ({ productos, razon } = r2);
        segunda = true;
      }
    }
    if (!productos.length) {
      // En una carpeta compartida (Descargas) lo que no coincide simplemente no es una foto de producto.
      if (INBOX === INBOX_DEFAULT) reporte.sinPareja.push(`${f}  →  ${razon}`);
      continue;
    }
    const img = await quitarFondo(ruta);
    const { webp, info } = await igualarTamano(img);
    const destino = `${productos[0].archivo}${segunda ? "-2" : ""}.webp`;
    const url = `/products/${destino}`;
    if (!PROBAR) {
      fs.writeFileSync(path.join(PUBLIC, destino), webp);
      for (const p of productos) {
        const actuales = cambios.get(p) ?? p.fotos;
        const siguientes = segunda ? [...new Set([...actuales, url])] : [url, ...actuales.filter((x) => x !== url && /-2\.webp$/.test(x))];
        cambios.set(p, siguientes);
      }
      hecho[clave] = new Date().toISOString();
    }
    const reemplaza = !segunda && productos.some((p) => p.fotos.length > 0);
    reporte.ok.push(
      `${f}  →  ${productos.map((p) => p.nombre).join(" + ")} [${razon}]  ${info.original} → ${info.final}${img.conFondo === "no-blanco" ? "  (fondo no blanco: se dejó la foto completa)" : img.conFondo ? "" : " (ya tenía transparencia)"}${reemplaza ? "  ⚠ REEMPLAZA la foto que ya tenía" : ""}`
    );
  }

  if (!PROBAR && cambios.size) {
    escribirFotosCsv(catalogo, cambios);
    const total = await regenerarCatalogo();
    fs.writeFileSync(LOG, JSON.stringify(hecho, null, 1));
    console.log(`Catálogo actualizado: ${total.length} productos, ${total.filter((p) => p.images.length).length} con foto.\n`);
  }

  console.log(`${PROBAR ? "[PRUEBA] " : ""}Procesadas: ${reporte.ok.length}`);
  reporte.ok.forEach((l) => console.log("  ✓ " + l));
  if (reporte.sinPareja.length) {
    console.log(`\nSin pareja (renómbralas con el SKU o el nombre exacto del producto): ${reporte.sinPareja.length}`);
    reporte.sinPareja.forEach((l) => console.log("  ✗ " + l));
  }
  if (reporte.omitidas) console.log(`\n(${reporte.omitidas} ya procesadas antes, omitidas)`);
}

(IGUALAR ? modoIgualar() : modoProcesar()).catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
