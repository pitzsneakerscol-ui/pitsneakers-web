// Miniaturas del catálogo: una copia liviana (800 px) de cada foto de public/products en public/products/t/.
// Las tarjetas del catálogo usan estas copias: son archivos estáticos que sirve la CDN al instante, sin esperar
// a que Vercel genere la versión reducida la primera vez que alguien pide cada foto.
//
//   npm run miniaturas            crea las que falten (y rehace las que cambiaron)
//   npm run miniaturas -- --todas rehace todas
//
// `npm run fotos` lo corre solo al terminar. Regla del nombre: /products/NOMBRE.ext  ->  /products/t/NOMBRE.webp
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public", "products");
const SALIDA = path.join(PUBLIC, "t");
const ANCHO = 800;
const EXT = /\.(webp|png|jpe?g)$/i;

export async function hacerMiniaturas({ todas = false } = {}) {
  fs.mkdirSync(SALIDA, { recursive: true });
  const origenes = fs.readdirSync(PUBLIC).filter((f) => EXT.test(f) && fs.statSync(path.join(PUBLIC, f)).isFile());
  const esperadas = new Set();
  let hechas = 0;
  for (const f of origenes) {
    const nombre = f.replace(EXT, "") + ".webp";
    esperadas.add(nombre);
    const destino = path.join(SALIDA, nombre);
    const origen = path.join(PUBLIC, f);
    if (!todas && fs.existsSync(destino) && fs.statSync(destino).mtimeMs >= fs.statSync(origen).mtimeMs) continue;
    await sharp(origen).resize({ width: ANCHO, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(destino);
    hechas++;
  }
  // Las miniaturas de fotos que ya no existen se borran.
  let borradas = 0;
  for (const f of fs.readdirSync(SALIDA)) {
    if (!esperadas.has(f)) {
      fs.unlinkSync(path.join(SALIDA, f));
      borradas++;
    }
  }
  console.log(`Miniaturas: ${hechas} creadas, ${borradas} borradas, ${esperadas.size} en total.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  hacerMiniaturas({ todas: process.argv.includes("--todas") }).catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
}
