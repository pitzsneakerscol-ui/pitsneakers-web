// Plantillas dinámicas para WhatsApp (grupos y difusión a clientes).
// Uso:  node docs/campana-blackfriday/plantillas-whatsapp.mjs [YYYY-MM-DD] [n_referencias]
// Todo lo que cambia (día, cuenta regresiva, nº de referencias, lista de pares) sale de las variables.

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const URL = "https://pitsneakers.com";

const parse = (s) => new Date(`${s}T12:00:00-05:00`);
const fmt = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

export const BF = { inicio: "2026-11-26", fin: "2026-11-30" };

/** Cuándo arranca: texto que cambia según la fecha de hoy. */
function cuando(hoy) {
  const d = diffDays(hoy, BF.inicio);
  if (d > 1) return { titulo: `BLACK FRIDAY llega en ${d} días`, linea: `Arranca el ${fmt(parse(BF.inicio))}` };
  if (d === 1) return { titulo: `BLACK FRIDAY llega MAÑANA, ${fmt(parse(BF.inicio))}`, linea: "Arranca mañana desde las 12 a. m." };
  if (d === 0) return { titulo: "YA ES BLACK FRIDAY", linea: "Arrancó hoy" };
  return { titulo: "BLACK FRIDAY sigue activo", linea: `Hasta el ${fmt(parse(BF.fin))}` };
}

/** Mensaje a clientes / comunidad: Black Friday. */
export function blackFridayClientes({ hoy, nRefs = 200 }) {
  const c = cuando(hoy);
  return [
    `🖤 *${c.titulo}* 🖤`,
    "",
    `${c.linea}, hasta el ${fmt(parse(BF.fin))}:`,
    `🔥 Más de ${nRefs} referencias con precio de oferta`,
    "🚚 Envío incluido a todo el país",
    "✅ Verificación incluida en cada par",
    "",
    "⚠️ Casi todos los pares son únicos: cuando se acaba, se acaba.",
    "",
    "💸 Ve ahorrando desde ya: que la quincena o el salario no se te vaya antes. Elige tu par con calma y llega listo el " + DIAS[parse(BF.inicio).getDay()] + ".",
    "",
    `👉 ${URL}/sale`,
  ].join("\n");
}

/** Mensaje de la comunidad de los lunes: nuevos ingresos. */
export function lunesNuevosIngresos({ hoy, nuevos = [] }) {
  const d = parse(hoy);
  const lista = nuevos.slice(0, 12).map((p) => `• ${p.nombre} — desde $${p.precio.toLocaleString("es-CO")}`);
  return [
    "☀️ ¡Buenos días, comunidad PITSNEAKERS!",
    "",
    `🆕 *LUNES DE NUEVOS INGRESOS* — ${fmt(d)}`,
    `Esta semana entraron *${nuevos.length} referencias nuevas*:`,
    ...lista,
    nuevos.length > 12 ? `…y ${nuevos.length - 12} más en las fotos de abajo 👇` : "Mira las fotos de abajo 👇",
    "",
    `👉 Todo el catálogo: ${URL}`,
  ].join("\n");
}

/** Pie de cada foto en la sección de nuevos ingresos. */
export function captionNuevoIngreso({ nombre, precio, tallas, slug }) {
  return [
    `🆕 *NUEVO INGRESO*`,
    `🔥 ${nombre}`,
    `💰 Desde $${precio.toLocaleString("es-CO")}`,
    `📏 Tallas: ${tallas}`,
    "✅ Nuevo y verificado",
    "",
    "💬 ¿Lo quieres? Escríbenos y te lo separamos",
    `👉 ${URL}/producto/${slug}`,
  ].join("\n");
}

// Demo por consola
if (process.argv[1]?.endsWith("plantillas-whatsapp.mjs")) {
  const hoy = process.argv[2] || "2026-11-23";
  const n = Number(process.argv[3] || 200);
  const nuevos = [
    { nombre: "Adidas Yeezy Foam RNR Clay Taupe", precio: 650000, tallas: "5 US · 8 US · 12 US", slug: "adidas-yeezy-foam-rnr-clay-taupe" },
    { nombre: "Jordan 4 Brick After Brick", precio: 1300000, tallas: "8,5 US · 9 US · 10 US", slug: "jordan-4-brick-after-brick" },
  ];
  console.log("=== BLACK FRIDAY (clientes) ===\n" + blackFridayClientes({ hoy, nRefs: n }));
  console.log("\n=== LUNES NUEVOS INGRESOS ===\n" + lunesNuevosIngresos({ hoy, nuevos }));
  console.log("\n=== CAPTION POR PAR ===\n" + captionNuevoIngreso(nuevos[0]));
}
