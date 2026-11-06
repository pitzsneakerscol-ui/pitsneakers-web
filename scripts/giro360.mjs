// Prepara el giro de 360° de un par a partir de una carpeta de fotos o de un video.
//
//   node scripts/giro360.mjs <slug-del-par> <carpeta-de-fotos | video.mp4> [cantidad=36]
//
// El slug es el del par en la web (lo que va después de /producto/ en la dirección, ej. jordan-jordan-4-la-lakers).
// Deja las fotos en public/products/360/<slug>/01.webp, 02.webp... y anota el par en src/data/spins.json.
// Para video hace falta ffmpeg instalado (en Windows: winget install Gyan.FFmpeg).
//
// Cómo grabarlo: el par sobre un plato giratorio, cámara fija a la altura del par, fondo liso, una sola vuelta completa
// (unos 10 segundos). Mientras más parejo el giro, mejor se ve. 36 fotos = una cada 10°.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import sharp from "sharp";

const [slug, input, countArg] = process.argv.slice(2);
const target = Number(countArg) || 36;
const root = resolve(import.meta.dirname, "..");
const IMG = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!slug || !input) fail("Uso: node scripts/giro360.mjs <slug-del-par> <carpeta-de-fotos | video.mp4> [cantidad=36]");
if (!/^[a-z0-9-]+$/.test(slug)) fail(`El slug "${slug}" no es válido (solo minúsculas, números y guiones).`);
if (!existsSync(input)) fail(`No existe: ${input}`);
if (target < 12 || target > 72) fail("La cantidad de fotos debe estar entre 12 y 72.");

let tmp = null;
let files;
if (statSync(input).isDirectory()) {
  files = readdirSync(input)
    .filter((f) => IMG.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => join(input, f));
} else {
  tmp = mkdtempSync(join(tmpdir(), "giro360-"));
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", input, "-vf", "fps=15", join(tmp, "%04d.png")], { stdio: "inherit" });
  if (r.error || r.status !== 0) fail("No pude leer el video. ¿Está instalado ffmpeg? (Windows: winget install Gyan.FFmpeg)");
  files = readdirSync(tmp).sort().map((f) => join(tmp, f));
}

if (files.length < 12) fail(`Hacen falta al menos 12 fotos para que el giro se vea fluido (encontré ${files.length}).`);

// Si hay más fotos de las necesarias, se toman repartidas de forma pareja a lo largo de la vuelta.
const count = Math.min(target, files.length);
const picked = Array.from({ length: count }, (_, i) => files[Math.floor((i * files.length) / count)]);

const out = join(root, "public", "products", "360", slug);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (let i = 0; i < picked.length; i++) {
  // 3:2 horizontal, el mismo marco de la ficha del producto.
  await sharp(picked[i]).rotate().resize(1500, 1000, { fit: "cover", position: "centre" }).webp({ quality: 82 }).toFile(join(out, `${String(i + 1).padStart(2, "0")}.webp`));
  process.stdout.write(`\r${i + 1}/${picked.length}`);
}
if (tmp) rmSync(tmp, { recursive: true, force: true });

const manifestPath = join(root, "src", "data", "spins.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
manifest[slug] = picked.length;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`\n✓ Giro de ${slug}: ${picked.length} fotos en public/products/360/${slug}/ y anotado en src/data/spins.json.`);
