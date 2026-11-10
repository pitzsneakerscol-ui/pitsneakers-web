// Cerebro del bot de WhatsApp: entiende el mensaje y decide qué responder. Sin base de datos ni red (pura),
// para poder probarla. Quien la llama (wa-bot.ts) guarda el estado, consulta pedidos y envía los mensajes.

export interface BotTexts {
  publishFee: number;
  publishBenefits: readonly string[];
  publishRequirements: readonly string[];
  hoursText: string;
}

export interface BotSite {
  /** "https://pitsneakers.com" sin barra final */
  url: string;
  shipFee: number;
  city: string;
}

/** Una silueta del catálogo (grupo de variantes) lista para buscar. */
export interface CatalogEntry {
  slug: string;
  name: string;
  brand: string;
  colorway?: string;
  sizes: string[];
  minPrice: number;
  maxPrice: number;
}

export type Intent =
  | "stop"
  | "start"
  | "human"
  | "order"
  | "commission"
  | "fee"
  | "sell"
  | "shipping"
  | "payment"
  | "verification"
  | "returns"
  | "hours"
  | "greeting"
  | "thanks"
  | "yes"
  | "no"
  | "catalog"
  | "unknown";

export type BotState = "" | "sell_model" | "sell_confirm";

export interface Decision {
  replies: string[];
  state: BotState;
  /** texto que el cliente describió (par que quiere publicar), para pasárselo al equipo */
  stateData?: string;
  optOut?: boolean;
  optIn?: boolean;
  /** pasar la conversación a una persona */
  handoff?: string;
  /** hay que buscar el pedido: referencia dada o, si es null, los del número */
  lookupOrder?: { ref: string | null };
  /** el cliente no fue entendido (el orquestador cuenta los seguidos) */
  misunderstood?: boolean;
}

export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9.,/\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const money = (n: number) => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/* ---------- Intención ---------- */

const ORDER_REF = /\bpits-?[a-z0-9]{7}\b/i;

export function extractOrderRef(text: string): string | null {
  const m = text.toUpperCase().match(/PITS-?([A-Z0-9]{7})\b/);
  return m ? `PITS-${m[1]}` : null;
}

const has = (t: string, re: RegExp) => re.test(t);

export function detectIntent(raw: string): Intent {
  const t = norm(raw);
  if (!t) return "unknown";
  const words = t.split(" ");
  const short = words.length <= 4;

  if (
    /^(stop|baja|bajame|dame de baja|parar|no mas)$/.test(t) ||
    has(t, /\b(dar(me)? de baja|darme de baja|no (me )?(escriban|escriba|manden|envien|molesten|escribas|mandes)|no quiero (recibir|mas mensajes|que me escriban)|cancelar (la )?(suscripcion|mensajes)|desuscrib\w*|borrame|elimina(me)? de la lista)\b/) ||
    (short && has(t, /\bstop\b/))
  )
    return "stop";
  if (/^(alta|reanudar|activar|suscribirme|quiero recibir|volver a recibir)\b/.test(t)) return "start";
  if (ORDER_REF.test(raw)) return "order";
  if (
    has(
      t,
      /\b(asesor|asesora|humano|humana|una persona|agente|encargado|encargada|dueno|duena|hablar con (alguien|una|un|el|la)|comunicar(me)? con|que me (llamen|llamen)|llamada|llamarme)\b/,
    )
  )
    return "human";
  if (has(t, /\b(mi pedido|mi orden|mi compra|mi guia|numero de guia|rastre\w*|seguimiento|donde (esta|va|viene)|ya (llego|salio|lo enviaron|despacharon)|estado (de|del) (mi )?pedido)\b/)) return "order";
  if (has(t, /\b(comision|porcentaje|cuanto me (queda|dejan|pagan|consignan|descuentan)|me descuentan|que cobran por vender)\b/)) return "commission";
  if (has(t, /\b(cuanto|costo|cuesta|vale|valor|precio|tarifa|cobran|cobra|cobro)\b/) && has(t, /\b(publicar|publicacion|publicarlo|publico|vender|comunidad|unirme)\b/)) return "fee";
  if (has(t, /\b(beneficios|ventajas|que (gano|ganan|incluye|me dan|ofrecen)|para que sirve|como funciona)\b/) && has(t, /\b(publicar|publicacion|comunidad|vender|publicado)\b/)) return "fee";
  if (
    has(
      t,
      /\b(vender|vendo|vendiendo|publicar|publico|publicarlo|publicacion|subir (un|mi|unos|unas|el|los)|consign\w*|quiero (poner|ofrecer|mostrar) (un|mi|unos|unas)|tengo (un|unos|unas)( par| tenis| zapatillas)?( para| que)|unirme como vendedor|ser vendedor|ser revendedor)\b/,
    )
  )
    return "sell";
  if (has(t, /\b(envio|envios|enviar|enviarlo|domicilio|entrega|entregan|cuanto (se )?(demora|tarda|demoran|tardan)|despacho|recoger|recogida|a otra ciudad)\b/)) return "shipping";
  if (has(t, /\b(pago|pagos|pagar|tarjeta|pse|nequi|daviplata|transferencia|contraentrega|contra entrega|wompi|credito|cuotas|fiado|apartar|separar)\b/)) return "payment";
  if (has(t, /\b(verific\w*|original(es)?|autentic\w*|legit\w*|fake|replica\w*|falso|falsos|garantia de autenticidad)\b/)) return "verification";
  if (has(t, /\b(cambio|cambios|devolucion|devolver|garantia|reembolso)\b/)) return "returns";
  if (has(t, /\b(horario|a que hora|hasta que hora|abren|atienden|cierran)\b/)) return "hours";
  if (/^(si|sii|sip|claro|dale|listo|de una|ok|okay|vale|perfecto|por favor|quiero|hagale|hagamos|publiquemoslo|publicalo|si quiero|si por favor)\b/.test(t) && short) return "yes";
  if (/^(no|nop|no gracias|no por ahora|despues|luego|mejor no|no quiero)\b/.test(t) && short) return "no";
  if (/^(hola|holi|ola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hi|saludos|que tal)\b/.test(t) && short) return "greeting";
  if (/^(gracias|muchas gracias|mil gracias|ok gracias|listo gracias|genial|super|chevere)\b/.test(t) && short) return "thanks";
  return "catalog";
}

/* ---------- Catálogo ---------- */

const STOP_WORDS = new Set(
  (
    "de del la el los las un una unos unas y o a al en con por para que tienen tiene tienes hay quiero busco buscando necesito me te se lo le les mi mis tu " +
    "interesa interesan par pares tenis tennis zapatillas zapatos talla tallas numero size us sneakers sneaker comprar compra ver mostrar muestrame " +
    "algo mas precio precios cuanto cuesta vale valor disponible disponibles disponibilidad favor porfa porfis hola buenas buenos dias tardes noches " +
    "cual cuales como es son esta estan tienen alguno alguna algun quisiera quiero gustaria info informacion nuevo nuevos usado usados original originales " +
    "vender vendo publicar publico subir tengo unos unas poner ofrecer consignar este esos esas ese esa mio mia"
  ).split(" "),
);

/** Tokens del mensaje que sirven para buscar un modelo (sin muletillas ni la talla). */
export function queryTokens(raw: string): string[] {
  const t = norm(raw).replace(/\b(?:talla|tallas|size|us|numero|en|t)\s*(?:un\s*)?\d{1,2}(?:[.,]\d)?\b/g, " ");
  return t
    .split(/[\s/]+/)
    .map((w) => w.replace(/^[.,-]+|[.,-]+$/g, ""))
    .filter((w) => w && !STOP_WORDS.has(w));
}

/** Talla que menciona el cliente ("talla 9", "t9", "en 9.5", "size 10"); null si no dice. */
export function extractSize(raw: string): string | null {
  const t = norm(raw);
  const m = t.match(/\b(?:talla|tallas|size|us|numero|en|t)\s*(?:un\s*)?(\d{1,2}(?:[.,]\d)?)\b/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!(n >= 3 && n <= 16)) return null;
  return Number.isInteger(n) ? String(n) : String(n);
}

const sizeKey = (s: string) => {
  const n = Number(String(s).replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export function hasSize(sizes: string[], size: string): boolean {
  const want = sizeKey(size);
  return sizes.some((s) => sizeKey(s) === want);
}

const haystack = (e: CatalogEntry) => norm(`${e.brand} ${e.name} ${e.colorway ?? ""}`);

/**
 * Modelos del catálogo que coinciden con lo que escribió el cliente. Una marca sola ("nike") no alcanza:
 * tiene que coincidir al menos una palabra del modelo, y casi todas las que escribió.
 */
export function searchCatalog(raw: string, catalog: CatalogEntry[], limit = 3): CatalogEntry[] {
  const tokens = queryTokens(raw);
  if (tokens.length === 0) return [];
  const brandWords = new Set(catalog.flatMap((e) => norm(e.brand).split(" ")));
  const scored: { e: CatalogEntry; score: number; all: boolean }[] = [];
  for (const e of catalog) {
    const h = haystack(e);
    const hw = new Set(h.split(/[\s/]+/));
    let matched = 0;
    let modelMatched = 0;
    for (const tk of tokens) {
      const ok = hw.has(tk) || (tk.length >= 4 && h.includes(tk));
      if (!ok) continue;
      matched++;
      if (!brandWords.has(tk)) modelMatched++;
    }
    if (modelMatched === 0) continue;
    if (matched / tokens.length < 0.6) continue;
    scored.push({ e, score: matched * 10 + modelMatched, all: matched === tokens.length });
  }
  scored.sort((a, b) => b.score - a.score || a.e.minPrice - b.e.minPrice);
  // Si alguno coincide con todo lo que escribió, solo se muestran esos (no los "parecidos").
  const exact = scored.filter((s) => s.all);
  return (exact.length ? exact : scored).slice(0, limit).map((s) => s.e);
}

const productLine = (e: CatalogEntry, site: BotSite, size: string | null) => {
  const price = e.minPrice === e.maxPrice ? money(e.minPrice) : `${money(e.minPrice)} a ${money(e.maxPrice)}`;
  const tallas = e.sizes.length ? `Tallas: ${e.sizes.join(", ")}` : "";
  const fit = size ? (hasSize(e.sizes, size) ? `✅ Tenemos talla ${size}` : `⚠️ No hay talla ${size} por ahora`) : "";
  const title = norm(e.name).startsWith(norm(e.brand)) ? e.name : `${e.brand} ${e.name}`;
  return [`*${title}${e.colorway ? ` ${e.colorway}` : ""}*`, price, tallas, fit, `${site.url}/producto/${e.slug}`].filter(Boolean).join("\n");
};

/* ---------- Textos ---------- */

export function menuText(): string {
  return [
    "Puedo ayudarte con:",
    "1️⃣ *Comprar* — escríbeme el modelo (y la talla) y te digo si lo tenemos y a cuánto",
    "2️⃣ *Vender o publicar* un par en la comunidad",
    "3️⃣ *Mi pedido* — dime tu número de pedido (PITS-…)",
    "4️⃣ *Envíos, pagos y verificación*",
    "Y si prefieres una persona, escribe *asesor*.",
  ].join("\n");
}

export function greetingText(name: string): string {
  const n = name ? ` ${name.split(" ")[0]}` : "";
  return `¡Hola${n}! 👋 Soy el asistente de *Pitsneakers*, sneakers y streetwear verificados.\n\n${menuText()}`;
}

export function sellPitch(t: BotTexts): string {
  return [
    `Publicar un par cuesta *${money(t.publishFee)}* y esto es lo que tienes:`,
    ...t.publishBenefits.map((b) => `✅ ${b}`),
    "",
    "Para publicarlo necesito:",
    ...t.publishRequirements.map((r) => `• ${r}`),
  ].join("\n");
}

export function orderStatusText(
  o: { reference: string; productName: string; size: string; status: string; fulfillment: string; carrier: string; tracking: string; delivery: string },
  site: BotSite,
): { text: string; incident: boolean } {
  const head = `*${o.productName}${o.size ? ` (talla ${o.size})` : ""}* — pedido ${o.reference}`;
  const link = `${site.url}/pedido/${o.reference}`;
  let body = "";
  let incident = false;
  if (o.status === "pendiente") body = "Está *pendiente de pago*. Cuando se confirme el pago empezamos a prepararlo.";
  else if (o.status !== "pagado") body = "El pago *no se completó*. Si quieres, intenta de nuevo desde la página o escribe *asesor*.";
  else {
    const pickup = o.delivery === "recogida";
    switch (o.fulfillment) {
      case "hacia_verificacion":
        body = "✅ Pago confirmado. Tu par viene en camino a nuestro punto de verificación.";
        break;
      case "preparando":
        body = "✅ Pago confirmado. Estamos verificando y empacando tu par.";
        break;
      case "despachado":
        body = pickup
          ? "📦 Tu par ya está *listo para recoger* en el punto de verificación."
          : `📦 Tu pedido ya fue *despachado*${o.carrier ? ` con ${o.carrier}` : ""}${o.tracking ? `. Guía: ${o.tracking}` : ""}.`;
        break;
      case "entregado":
        body = "🎉 Tu pedido figura como *entregado*.";
        break;
      case "incidencia":
        body = "Tu pedido tuvo una novedad en el envío. Ya le aviso a una persona del equipo para que te escriba.";
        incident = true;
        break;
      default:
        body = "✅ Pago confirmado. Estamos preparando tu pedido.";
    }
  }
  return { text: `${head}\n${body}\nSeguimiento: ${link}`, incident };
}

/* ---------- Decisión ---------- */

export interface Ctx {
  state: BotState;
  stateData: string;
  name: string;
  catalog: CatalogEntry[];
  texts: BotTexts;
  site: BotSite;
  /** mensajes seguidos sin entender (para pasar a una persona) */
  misses: number;
}

const FAQ: Record<string, (c: Ctx) => string> = {
  shipping: (c) =>
    `Enviamos a *todo el país*. ${c.site.shipFee > 0 ? `El envío cuesta ${money(c.site.shipFee)} y se suma antes de pagar.` : "Por Black Friday el envío es *gratis*."} Si estás en ${c.site.city.split(",")[0]} puedes *recoger* en nuestro punto de verificación sin costo. Antes de salir, cada par pasa por revisión.`,
  payment: (c) =>
    `Pagas en línea de forma segura con *Wompi* al hacer clic en *Comprar ahora* en la página (${c.site.url}). Ahí ves los medios disponibles. El costo del procesamiento del pago se muestra antes de confirmar. Si prefieres otra forma de pago, escribe *asesor*.`,
  verification: (c) =>
    `Cada par pasa por *revisión física y autenticación* antes de publicarse y otra vez antes de enviarse. Mira cómo lo hacemos: ${c.site.url}/verificacion`,
  returns: (c) => `Las políticas de cambios y devoluciones están completas aquí: ${c.site.url}/politicas\nSi es por un pedido tuyo, escribe *asesor* y te ayudamos.`,
  hours: (c) => `Atendemos por aquí ${c.texts.hoursText}. Fuera de horario te responde el asistente y el equipo te escribe apenas abra.`,
};

function sellEvaluate(modelText: string, ctx: Ctx): Decision {
  const size = extractSize(modelText);
  const found = searchCatalog(modelText, ctx.catalog, 2);
  const exact = size ? found.find((e) => hasSize(e.sizes, size)) : undefined;
  if (exact) {
    return {
      replies: [
        `Ese par (talla ${size}) *ya está publicado* en la página 👇\n${ctx.site.url}/producto/${exact.slug}\n\nSi es otro par igual en otra talla o estado, cuéntame cuál y lo vemos. Si quieres publicar otro modelo, escríbemelo.`,
      ],
      state: "",
    };
  }
  const lead = found.length
    ? `Ya hay un modelo parecido en la página: *${found[0].brand} ${found[0].name}*${size ? ` (no en talla ${size})` : ""}. Si es el mismo, tu par se agrega; si es otro, también lo podemos publicar.`
    : "Ese par *todavía no está publicado* ✅";
  return {
    replies: [`${lead}\n\n${sellPitch(ctx.texts)}\n\n¿Lo publicamos? Responde *SÍ* y te paso con un asesor para las fotos y el pago de ${money(ctx.texts.publishFee)}.`],
    state: "sell_confirm",
    stateData: modelText.slice(0, 300),
  };
}

export function decide(raw: string, ctx: Ctx): Decision {
  const intent = detectIntent(raw);
  const base: Decision = { replies: [], state: ctx.state };

  // Estas siempre mandan, sin importar en qué paso va la conversación.
  if (intent === "stop") {
    return { replies: ["Listo, no te escribimos más por aquí. 🙏 Si algún día quieres volver, escribe *ALTA*."], state: "", optOut: true };
  }
  if (intent === "start") {
    return { replies: ["¡Bienvenido de nuevo! 🙌 Ya puedes recibir nuestros mensajes.\n\n" + menuText()], state: "", optIn: true };
  }
  if (intent === "human") {
    return {
      replies: [`Claro, ya le avisé a una persona del equipo y te escribe por aquí. 🙌\nHorario de atención: ${ctx.texts.hoursText}.`],
      state: "",
      handoff: "Pidió hablar con una persona",
    };
  }
  if (intent === "order") {
    return { replies: [], state: "", lookupOrder: { ref: extractOrderRef(raw) } };
  }

  // Pasos del flujo de publicar.
  if (ctx.state === "sell_model") {
    return sellEvaluate(raw, ctx);
  }
  if (ctx.state === "sell_confirm") {
    if (intent === "yes") {
      return {
        replies: ["¡Perfecto! 🙌 Ya le avisé a un asesor: te escribe por aquí para recibir las fotos y cuadrar el pago de la publicación. Si quieres, ve adelantando las fotos en este chat."],
        state: "",
        handoff: `Quiere publicar un par: ${ctx.stateData || "(sin descripción)"}`,
      };
    }
    if (intent === "no") {
      return { replies: ["Sin problema 👍 Cuando quieras publicar un par, escríbeme *vender*. ¿Algo más en lo que te ayude?"], state: "" };
    }
    // Mandó más datos del par (modelo, talla, precio): se los pasamos al asesor.
    if (intent === "catalog" || intent === "unknown") {
      return {
        replies: ["Anotado ✅ Le paso esto a un asesor para que te confirme y te pida las fotos. Te escribe por aquí."],
        state: "",
        handoff: `Quiere publicar un par: ${ctx.stateData || ""} — dio más datos: ${raw.slice(0, 300)}`,
      };
    }
  }

  switch (intent) {
    case "commission":
      return {
        replies: ["Lo que te queda depende del par y del precio, así que prefiero que un asesor te haga el cálculo exacto. Ya le aviso y te escribe por aquí. 🙌"],
        state: "",
        handoff: "Preguntó por la comisión / cuánto le queda al vender",
      };
    case "fee":
      return {
        replies: [`${sellPitch(ctx.texts)}\n\nCuéntame *qué par quieres publicar* (modelo, talla y estado) y reviso si ya está en la página.`],
        state: "sell_model",
      };
    case "sell": {
      const rest = queryTokens(raw).filter((w) => !/^(vender|vendo|publicar|vendiendo|publicarlo|publicacion|comunidad|consignar|consigno|vendedor|revendedor)$/.test(w));
      if (rest.length >= 2) return sellEvaluate(raw, ctx);
      return {
        replies: [
          "¡Genial! 🙌 Cuéntame *qué par quieres publicar*: modelo y colorway, talla y si es nuevo o usado. Así reviso si ya está en la página.",
        ],
        state: "sell_model",
      };
    }
    case "shipping":
    case "payment":
    case "verification":
    case "returns":
    case "hours":
      return { ...base, replies: [FAQ[intent](ctx)], state: "" };
    case "greeting":
      return { replies: [greetingText(ctx.name)], state: "" };
    case "thanks":
      return { replies: ["¡Con gusto! 🙌 Si necesitas algo más, aquí estoy."], state: "" };
    case "yes":
    case "no":
      return { replies: [menuText()], state: "" };
    default:
      break;
  }

  // Búsqueda de un modelo ("tienen jordan 1 chicago talla 9?")
  const size = extractSize(raw);
  const found = searchCatalog(raw, ctx.catalog, 3);
  if (found.length) {
    const lines = found.map((e) => productLine(e, ctx.site, size)).join("\n\n");
    const intro = found.length === 1 ? "Esto fue lo que encontré 👇" : "Encontré estos 👇";
    return { replies: [`${intro}\n\n${lines}\n\nPuedes comprarlo directo en la página. Si quieres otro modelo, escríbemelo.`], state: "" };
  }
  const tokens = queryTokens(raw);
  const brands = new Set(ctx.catalog.flatMap((e) => norm(e.brand).split(" ")));
  if (tokens.length > 0 && tokens.every((w) => brands.has(w))) {
    return {
      replies: [`Tenemos varios de esa marca 👟 Dime el *modelo* que buscas (por ejemplo "Dunk Low Panda talla 9") o míralos todos aquí: ${ctx.site.url}/sneakers`],
      state: "",
    };
  }
  if (tokens.length > 0 && tokens.length <= 6) {
    return {
      replies: [
        `No encontré "${tokens.join(" ")}" en el catálogo ahora mismo. Puedes ver todo lo disponible aquí: ${ctx.site.url}/sneakers\nSi lo buscas en una talla específica, escribe *asesor* y lo conseguimos por encargo.`,
      ],
      state: "",
      misunderstood: true,
    };
  }
  return {
    replies: [`No estoy seguro de haberte entendido 😅\n\n${menuText()}`],
    state: "",
    misunderstood: true,
  };
}
