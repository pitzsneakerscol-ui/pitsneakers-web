// Plantillas de correo, formato y reemplazo de variables. Seguro para cliente y servidor.
import { siteConfig } from "@/config/site";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";

/* ---------- Variables ---------- */

export const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: "nombre", label: "Nombre del destinatario" },
  { key: "monto", label: "Monto (ej. $350.000)" },
  { key: "concepto", label: "Concepto, producto o pedido" },
  { key: "talla", label: "Talla(s) del par (ej. 9 US)" },
  { key: "fecha_limite", label: "Fecha límite o de vigencia" },
  { key: "tienda", label: "Pitsneakers" },
  { key: "whatsapp", label: "Link de WhatsApp de la tienda" },
  { key: "comunidad", label: "Link de la comunidad de WhatsApp" },
  { key: "instagram", label: "Link de Instagram" },
  { key: "web", label: "Link de la página (o WhatsApp si no está configurada)" },
];

export type Vars = Record<string, string>;

/** Variables que no dependen del destinatario ni del formulario. */
export function siteVars(): Vars {
  const wa = `https://wa.me/${siteConfig.whatsappNumber}`;
  return {
    tienda: siteConfig.name,
    whatsapp: wa,
    comunidad: siteConfig.whatsappCommunityUrl,
    instagram: siteConfig.instagramUrl,
    web: siteConfig.siteUrl || wa,
  };
}

/** Reemplaza {{variable}}; las que no tienen valor se dejan visibles para que se note. */
export function renderTemplate(source: string, vars: Vars): string {
  return source.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, key: string) => {
    const v = vars[key];
    return v === undefined || v === "" ? m : v;
  });
}

/** Variables sin valor en un texto ya renderizado. */
export function missingVars(rendered: string): string[] {
  return [...new Set([...rendered.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]))];
}

/* ---------- Formato del mensaje (estilo marketing) ----------
 *
 *   # Titular grande          ## Subtítulo
 *   ==palabra==  → resalta en rojo      **texto** → negrita
 *   > Caja destacada (varias líneas seguidas forman una sola)
 *   - Lista con viñetas
 *   [boton: Texto del botón | https://enlace]
 *   [producto: foto | nombre | detalle | enlace]  fila con foto pequeña (como en el seguimiento del pedido)
 *   [paso: ok | título | texto | dato]            línea de estados con checks (ok / actual / no)
 *   ---  → línea divisoria
 *   Los párrafos se separan con una línea en blanco.
 */

const INK = "#0a0a0a";
const ACCENT = "#c8402a";
/** Rojo más vivo para resaltar sobre fondo oscuro. */
const HOT = "#ff5a3c";
const FONT = "Arial,Helvetica,sans-serif";
const DISPLAY = "Impact,'Arial Narrow Bold','Arial Narrow',Arial,sans-serif";
/** Colores de la marca (los mismos de la barra superior de la página). */
const BRAND = ["#ff5a3c", "#ffd23f", "#3ddc84", "#4cc9f0", "#ff6b9d"];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isHttps = (u: string) => /^https:\/\/[^\s"'<>]+$/.test(u);

/** `mark` es el color del resaltado ==así==; en el titular oscuro se usa amarillo neón. */
function inline(raw: string, mark = ACCENT, link = ACCENT): string {
  let s = esc(raw);
  s = s.replace(/https:\/\/[^\s<]+/g, (url) => {
    const m = url.match(/[.,;:!?)]+$/);
    const tail = m ? m[0] : "";
    const clean = tail ? url.slice(0, -tail.length) : url;
    return `<a href="${clean}" style="color:${link};font-weight:bold">${clean}</a>${tail}`;
  });
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/==(.+?)==/g, `<span style="color:${mark}">$1</span>`);
  return s;
}

/** Franja de colores de la marca (celdas de tabla: funciona en todos los clientes de correo). */
function stripe(height = 6): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${BRAND.map(
    (c) => `<td width="20%" height="${height}" style="background:${c};font-size:0;line-height:0">&nbsp;</td>`
  ).join("")}</tr></table>`;
}

/* Fila de producto y línea de estados del pedido (como en el seguimiento de la página):
 *   [producto: https://foto | Nombre | Talla: 9.5 · nuevo | https://enlace]   (foto y enlace opcionales: "-" o vacío)
 *   [paso: ok | Pedido confirmado | Texto | dato destacado]                    (ok = hecho, actual = en curso, no = pendiente)
 */
interface ProductLine { img: string; name: string; detail: string; url: string }
interface StepLine { state: "ok" | "actual" | "no"; title: string; text: string; extra: string }

const cells = (t: string) => {
  const m = t.match(/^\[\w+:\s*([\s\S]*?)\s*\]$/);
  return m ? m[1].split("|").map((c) => c.trim()) : [];
};

function parseProduct(t: string): ProductLine | null {
  const [img = "", name = "", detail = "", url = ""] = cells(t);
  if (!name) return null;
  return { img: isHttps(img) ? img : "", name, detail, url: isHttps(url) ? url : "" };
}

function parseStep(t: string): StepLine | null {
  const [state = "", title = "", text = "", extra = ""] = cells(t);
  if (!title || !(state === "ok" || state === "actual" || state === "no")) return null;
  return { state, title, text, extra };
}

function productRow(p: ProductLine): string {
  const photo = p.img
    ? `<td width="112" valign="middle" style="padding:16px 14px 16px 0"><img src="${esc(p.img)}" alt="${esc(p.name)}" width="98" style="display:block;width:98px;height:auto;border:0;border-radius:10px;background:#f4f1ea"></td>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 26px;border-top:1px solid #e9e4da;border-bottom:1px solid #e9e4da"><tr>${photo}<td valign="middle" style="padding:16px 0"><div style="font-size:17px;font-weight:bold;line-height:1.35;color:${INK}">${esc(p.name)}</div>${
    p.detail ? `<div style="margin-top:7px"><span style="display:inline-block;border:1px solid #d9d4c9;border-radius:6px;padding:2px 9px;font-size:12px;font-weight:bold;color:#333">${esc(p.detail)}</span></div>` : ""
  }${
    p.url ? `<div style="margin-top:10px"><a href="${esc(p.url)}" style="color:#15803d;font-size:14px;font-weight:bold;text-decoration:underline">Ver producto</a></div>` : ""
  }</td></tr></table>`;
}

/** Cuadrícula de fotos grandes, de a dos por fila (cada una abre en grande al tocarla). [fotos: https://a | https://b | …] */
function photoGrid(urls: string[]): string {
  const rows: string[] = [];
  for (let i = 0; i < urls.length; i += 2) {
    const tds = urls.slice(i, i + 2).map((u, j) => {
      const n = i + j + 1;
      return `<td width="50%" valign="top" style="padding:0 ${j === 0 ? "5px 10px 0" : "0 10px 5px"}"><a href="${esc(u)}"><img src="${esc(u)}" alt="Foto ${n} de tu par" width="270" style="display:block;width:100%;max-width:270px;height:auto;border:0;border-radius:10px;background:#f4f1ea"></a></td>`;
    });
    if (tds.length === 1) tds.push(`<td width="50%">&nbsp;</td>`);
    rows.push(`<tr>${tds.join("")}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 24px">${rows.join("")}</table>`;
}

const GREEN = "#16a34a";

/** Línea de estados vertical: círculo con check si está hecho, aro si es el actual, vacío si falta. La línea une los círculos. */
function timeline(steps: StepLine[]): string {
  const rows = steps.map((s, i) => {
    const last = i === steps.length - 1;
    const circle =
      s.state === "ok"
        ? `background:${GREEN};color:#ffffff;font-size:15px;font-weight:bold`
        : s.state === "actual"
          ? `background:#ffffff;border:3px solid ${GREEN}`
          : "background:#ffffff;border:2px solid #cfcac0";
    const line = last ? "" : `${s.state === "ok" && steps[i + 1].state === "ok" ? GREEN : "#d9d4c9"}`;
    const lineCss = line ? `background-image:linear-gradient(${line},${line});background-repeat:no-repeat;background-position:center top;background-size:2px 100%;` : "";
    return `<tr><td width="42" valign="top" align="center" style="${lineCss}"><table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;border-radius:14px;line-height:28px;${circle}">${s.state === "ok" ? "&#10003;" : "&nbsp;"}</td></tr></table></td><td valign="top" style="padding:2px 0 ${last ? 4 : 24}px 6px"><div style="font-size:17px;font-weight:bold;line-height:1.3;color:${s.state === "no" ? "#8a857b" : INK}">${esc(s.title)}</div>${
      s.text ? `<div style="margin-top:4px;font-size:14px;line-height:1.55;color:#6b665c">${inline(s.text)}</div>` : ""
    }${s.extra ? `<div style="margin-top:4px;font-size:14px;font-weight:bold;color:${INK}">${esc(s.extra)}</div>` : ""}</td></tr>`;
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 26px">${rows.join("")}</table>`;
}

function blocks(body: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  let list: string[] = [];
  let steps: StepLine[] = [];

  const flush = () => {
    if (steps.length) {
      out.push(timeline(steps));
      steps = [];
    }
    if (para.length) {
      out.push(
        `<p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:#1a1a1a">${para.map((l) => inline(l)).join("<br>")}</p>`
      );
      para = [];
    }
    if (quote.length) {
      out.push(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:#fff1ec;border-left:6px solid ${ACCENT};border-radius:8px;padding:18px 20px;font-size:16px;line-height:1.6;color:#1a1a1a">${quote.map((l) => inline(l)).join("<br>")}</td></tr></table>`
      );
      quote = [];
    }
    if (list.length) {
      out.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${list
          .map(
            (li, i) =>
              `<tr><td style="padding:5px 12px 5px 0;color:${BRAND[i % BRAND.length]};font-size:18px;vertical-align:top;line-height:1.4">&#9654;</td><td style="padding:5px 0;font-size:16px;line-height:1.55;color:#1a1a1a">${inline(li)}</td></tr>`
          )
          .join("")}</table>`
      );
      list = [];
    }
  };

  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (t === "") {
      flush();
    } else if (t.startsWith("## ")) {
      flush();
      out.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 12px"><tr><td style="width:44px;height:5px;background:${ACCENT};font-size:0;line-height:0">&nbsp;</td></tr></table><h2 style="margin:0 0 12px;font-family:${DISPLAY};font-size:28px;line-height:1.1;letter-spacing:.5px;text-transform:uppercase;color:${INK};font-weight:normal">${inline(t.slice(3))}</h2>`
      );
    } else if (t.startsWith("# ")) {
      flush();
      out.push(
        `<h1 style="margin:0 0 18px;font-family:${DISPLAY};font-size:40px;line-height:1.02;letter-spacing:.5px;text-transform:uppercase;color:${INK};font-weight:normal">${inline(t.slice(2))}</h1>`
      );
    } else if (t === "---") {
      flush();
      out.push(`<hr style="border:none;border-top:2px dashed #e4dfd6;margin:26px 0">`);
    } else if (/^\[producto:/i.test(t)) {
      flush();
      const p = parseProduct(t);
      if (p) out.push(productRow(p));
    } else if (/^\[fotos:/i.test(t)) {
      flush();
      const urls = cells(t).filter(isHttps).slice(0, 8);
      if (urls.length) out.push(photoGrid(urls));
    } else if (/^\[paso:/i.test(t)) {
      if (para.length || quote.length || list.length) flush();
      const s = parseStep(t);
      if (s) steps.push(s);
    } else if (/^\[boton:/i.test(t)) {
      flush();
      flush();
      const m = t.match(/^\[boton:\s*(.+?)\s*\|\s*(\S+?)\s*\]$/i);
      if (m && isHttps(m[2])) {
        out.push(
          `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 28px"><tr><td style="background:${ACCENT};border-bottom:4px solid #8f2b1a;border-radius:999px"><a href="${m[2]}" style="display:inline-block;padding:17px 36px;font-family:${FONT};font-size:15px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none">${esc(m[1])} &rarr;</a></td></tr></table>`
        );
      } else {
        // Botón mal escrito o con enlace no seguro: se muestra como texto para que se note.
        para.push(t);
      }
    } else if (t.startsWith("> ")) {
      if (para.length || list.length) flush();
      quote.push(t.slice(2));
    } else if (t.startsWith("- ") || t.startsWith("• ")) {
      if (para.length || quote.length) flush();
      list.push(t.slice(2));
    } else {
      if (quote.length || list.length) flush();
      para.push(t);
    }
  }
  flush();
  return out.join("\n");
}

/* ---------- Diseños limpios (estilo tienda premium) ----------
 *
 * Se activan con una línea [diseno: minimal], [diseno: grilla] o [diseno: noir] al principio del mensaje:
 *   minimal  fondo blanco, mucho aire, foto grande y botón negro (estilo GOAT)
 *   grilla   tarjeta blanca sobre gris, pares en cuadrícula con precio y sello de verificado (estilo StockX)
 *   noir     fondo negro, letra fina y botón blanco (versión oscura, de lujo)
 * Además del formato normal (# titular, ## subtítulo, párrafos, - viñetas, > nota, --- línea, [boton: …]) aceptan:
 *   [imagen: https://foto | texto alternativo | https://enlace]      foto de borde a borde (enlace opcional)
 *   [etiqueta: NUEVO EN PITSNEAKERS]                                 línea chica sobre el titular
 *   [tarjeta: https://foto | TÍTULO | descripción | botón | https://enlace]   un par destacado, grande
 *   [par: https://foto | MARCA | Nombre | Talla 9 US | $1.100.000 | https://enlace]   par en cuadrícula (los seguidos van de a dos)
 */

type LuxTheme = "minimal" | "grilla" | "noir";

interface Look {
  outer: string; // fondo alrededor del correo
  bg: string; // fondo del correo
  ink: string; // texto principal
  soft: string; // texto de párrafo
  muted: string; // texto secundario
  line: string; // líneas finas
  tile: string; // fondo de las fotos de los pares
  btnBg: string;
  btnFg: string;
  align: "center" | "left";
  card: boolean; // correo como tarjeta sobre el fondo
}

const LOOKS: Record<LuxTheme, Look> = {
  minimal: { outer: "#ffffff", bg: "#ffffff", ink: "#111111", soft: "#4a4a4a", muted: "#8a8a8a", line: "#e7e7e7", tile: "#f5f5f5", btnBg: "#111111", btnFg: "#ffffff", align: "center", card: false },
  grilla: { outer: "#f1f1f1", bg: "#ffffff", ink: "#111111", soft: "#4a4a4a", muted: "#8a8a8a", line: "#ebebeb", tile: "#f5f5f5", btnBg: "#111111", btnFg: "#ffffff", align: "left", card: true },
  noir: { outer: "#000000", bg: "#0b0b0b", ink: "#ffffff", soft: "#cfcfcf", muted: "#8f8f8f", line: "#262626", tile: "#141414", btnBg: "#ffffff", btnFg: "#0a0a0a", align: "center", card: false },
};

const LUX_FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const VERIFIED = "#0a8f55";

/** Nombre del diseño pedido en el mensaje, o null si el mensaje usa el diseño de siempre. "lanzamiento" y "editorial" son nombres antiguos de noir. */
function luxThemeOf(lines: string[]): LuxTheme | null {
  for (const l of lines) {
    const m = l.trim().match(/^\[diseno:\s*(\w+)\s*\]$/i);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === "minimal" || k === "grilla" || k === "noir") return k;
    if (k === "lanzamiento" || k === "editorial") return "noir";
  }
  return null;
}

function luxRows(body: string, L: Look): string {
  const rows: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];
  let tiles: string[] = [];
  const left = L.align === "left";
  const ta = L.align;

  const row = (inner: string, top = 0, bottom = 20, side = 40) =>
    rows.push(`<tr><td align="${ta}" style="background:${L.bg};padding:${top}px ${side}px ${bottom}px;text-align:${ta}">${inner}</td></tr>`);
  const button = (href: string, label: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" ${left ? "" : 'align="center"'} style="margin:0 ${left ? "0" : "auto"}"><tr><td style="background:${L.btnBg}"><a href="${esc(href)}" style="display:inline-block;padding:16px 38px;font-family:${LUX_FONT};font-size:12px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${L.btnFg};text-decoration:none">${esc(label)}</a></td></tr></table>`;
  const wordInline = (s: string) => inline(s, L.ink, L.ink);

  const flushTiles = () => {
    if (!tiles.length) return;
    const trs: string[] = [];
    for (let i = 0; i < tiles.length; i += 2) {
      const pair = tiles.slice(i, i + 2);
      const tds = pair.map((t, j) => `<td width="50%" valign="top" style="padding:0 ${j === 0 ? "6px" : "0"} 22px ${j === 0 ? "0" : "6px"}">${t}</td>`);
      if (tds.length === 1) tds.push(`<td width="50%">&nbsp;</td>`);
      trs.push(`<tr>${tds.join("")}</tr>`);
    }
    rows.push(`<tr><td style="background:${L.bg};padding:6px 34px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${trs.join("")}</table></td></tr>`);
    tiles = [];
  };
  const flush = () => {
    if (para.length) {
      row(`<p style="margin:0;font-family:${LUX_FONT};font-size:16px;line-height:1.75;color:${L.soft}">${para.map((l) => inline(l, L.ink, L.ink)).join("<br>")}</p>`, 0, 22);
      para = [];
    }
    if (quote.length) {
      row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${L.line};border-bottom:1px solid ${L.line};padding:18px 4px;font-family:${LUX_FONT};font-size:15px;line-height:1.7;color:${L.soft};text-align:${ta}">${quote.map((l) => wordInline(l)).join("<br>")}</td></tr></table>`, 4, 26);
      quote = [];
    }
    if (list.length) {
      row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list
          .map((li) => `<tr><td style="border-top:1px solid ${L.line};padding:13px 2px;font-family:${LUX_FONT};font-size:15px;line-height:1.55;color:${L.soft};text-align:left">${wordInline(li)}</td></tr>`)
          .join("")}<tr><td style="border-top:1px solid ${L.line};font-size:0;line-height:0;height:1px">&nbsp;</td></tr></table>`,
        2,
        26,
      );
      list = [];
    }
  };

  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (t === "") {
      flush();
      continue;
    }
    if (/^\[par:/i.test(t)) {
      flush();
      const [src = "", brand = "", name = "", detail = "", price = "", href = ""] = cells(t);
      if (!name) continue;
      const img = isHttps(src) ? `<tr><td style="background:${L.tile};padding:10px"><img src="${esc(src)}" alt="${esc(name)}" width="240" style="display:block;width:100%;height:auto;border:0"></td></tr>` : "";
      const tile = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${img}<tr><td style="padding:12px 2px 0;text-align:left;font-family:${LUX_FONT}">${
        brand ? `<div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${L.muted}">${esc(brand)}</div>` : ""
      }<div style="margin-top:3px;font-size:14px;font-weight:700;line-height:1.35;color:${L.ink}">${esc(name)}</div>${
        detail ? `<div style="margin-top:3px;font-size:12px;line-height:1.4;color:${L.muted}">${esc(detail)}</div>` : ""
      }${price ? `<div style="margin-top:7px;font-size:15px;font-weight:700;color:${L.ink}">${esc(price)}</div>` : ""}${
        L === LOOKS.grilla ? `<div style="margin-top:6px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${VERIFIED}">&#10003; Verificado</div>` : ""
      }</td></tr></table>`;
      tiles.push(isHttps(href) ? `<a href="${esc(href)}" style="text-decoration:none;color:inherit">${tile}</a>` : tile);
      continue;
    }
    flushTiles();
    if (/^\[imagen:/i.test(t)) {
      flush();
      const [src = "", alt = "", href = ""] = cells(t);
      if (isHttps(src)) {
        const img = `<img src="${esc(src)}" alt="${esc(alt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0">`;
        rows.push(`<tr><td style="background:${L.tile};padding:0;font-size:0;line-height:0">${isHttps(href) ? `<a href="${esc(href)}">${img}</a>` : img}</td></tr>`);
      }
    } else if (/^\[etiqueta:/i.test(t)) {
      flush();
      const [txt = ""] = cells(t);
      if (txt) row(`<div style="font-family:${LUX_FONT};font-size:11px;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;color:${L.muted}">${esc(txt)}</div>`, 38, 14);
    } else if (/^\[tarjeta:/i.test(t)) {
      flush();
      const [src = "", title = "", text = "", label = "", href = ""] = cells(t);
      const photo = isHttps(src) ? `<tr><td style="background:${L.tile};padding:14px"><img src="${esc(src)}" alt="${esc(title)}" width="500" style="display:block;width:100%;height:auto;border:0"></td></tr>` : "";
      const btn = label && isHttps(href) ? `<div style="margin-top:20px">${button(href, label)}</div>` : "";
      row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${photo}<tr><td align="${ta}" style="padding:20px 2px 0;text-align:${ta};font-family:${LUX_FONT}"><div style="font-size:22px;font-weight:700;line-height:1.2;letter-spacing:-.3px;color:${L.ink}">${esc(title)}</div>${
          text ? `<div style="margin-top:8px;font-size:15px;line-height:1.65;color:${L.muted}">${wordInline(text)}</div>` : ""
        }${btn}</td></tr></table>`,
        8,
        30,
        34,
      );
    } else if (/^\[boton:/i.test(t)) {
      flush();
      const m = t.match(/^\[boton:\s*(.+?)\s*\|\s*(\S+?)\s*\]$/i);
      if (m && isHttps(m[2])) row(button(m[2], m[1]), 6, 28);
      else para.push(t);
    } else if (t.startsWith("## ")) {
      flush();
      row(`<h2 style="margin:0;font-family:${LUX_FONT};font-size:22px;font-weight:700;line-height:1.2;letter-spacing:-.3px;color:${L.ink}">${wordInline(t.slice(3))}</h2>`, 6, 14);
    } else if (t.startsWith("# ")) {
      flush();
      row(`<h1 style="margin:0;font-family:${LUX_FONT};font-size:34px;font-weight:700;line-height:1.1;letter-spacing:-1px;color:${L.ink}">${wordInline(t.slice(2))}</h1>`, 0, 18);
    } else if (/^\[diseno:/i.test(t)) {
      continue;
    } else if (t === "---") {
      flush();
      row(`<div style="border-top:1px solid ${L.line};height:1px;font-size:0;line-height:0">&nbsp;</div>`, 8, 18);
    } else if (t.startsWith("> ")) {
      if (para.length || list.length) flush();
      quote.push(t.slice(2));
    } else if (t.startsWith("- ") || t.startsWith("• ")) {
      if (para.length || quote.length) flush();
      list.push(t.slice(2));
    } else {
      if (quote.length || list.length) flush();
      para.push(t);
    }
  }
  flush();
  flushTiles();
  rows.push(`<tr><td style="background:${L.bg};font-size:0;line-height:0;height:20px">&nbsp;</td></tr>`);
  return rows.join("\n");
}

/** Documento completo del diseño limpio: encabezado con el nombre de la tienda, el contenido y un pie discreto. */
function renderLuxHtml(subject: string, body: string, theme: LuxTheme, opts?: { unsubscribeUrl?: string }): string {
  const L = LOOKS[theme];
  const wa = `https://wa.me/${siteConfig.whatsappNumber}`;
  const link = (href: string, label: string) => `<a href="${esc(href)}" style="color:${L.ink};text-decoration:underline">${label}</a>`;
  const inner = `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${L.bg}${L.card ? ";border-radius:6px;overflow:hidden" : ""}">
<tr><td align="center" style="background:${L.bg};padding:30px 20px 24px;border-bottom:1px solid ${L.line}"><div style="font-family:${LUX_FONT};font-size:19px;font-weight:800;letter-spacing:7px;color:${L.ink}">PITSNEAKERS</div><div style="margin-top:7px;font-family:${LUX_FONT};font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${L.muted}">Verificados &middot; Colombia</div></td></tr>
${luxRows(body, L)}
<tr><td align="center" style="background:${L.bg};padding:26px 30px 30px;border-top:1px solid ${L.line};font-family:${LUX_FONT};font-size:12px;line-height:1.8;color:${L.muted}">
<div style="font-size:13px;font-weight:800;letter-spacing:5px;color:${L.ink}">PITSNEAKERS</div>
<div style="margin-top:4px">${esc(siteConfig.city)} &middot; Sneakers y streetwear verificados par a par</div>
<div style="margin-top:10px">${link(wa, "WhatsApp")} &nbsp;&middot;&nbsp; ${link(siteConfig.instagramUrl, "Instagram")} &nbsp;&middot;&nbsp; ${link(siteConfig.whatsappCommunityUrl, "Comunidad")}</div>
<div style="margin-top:12px;font-size:11px">Recibes este correo porque haces parte de la comunidad Pitsneakers. ${
    opts?.unsubscribeUrl ? `Si ya no quieres recibir estos correos, ${link(opts.unsubscribeUrl, "date de baja aquí")}.` : "Si ya no quieres recibir mensajes, responde &ldquo;NO&rdquo; a este correo."
  }</div>
</td></tr>
</table>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${L.outer};font-family:${LUX_FONT}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${L.outer}"><tr><td align="center" style="padding:${L.card ? "24px 10px 30px" : "0 0 0"}">${inner}</td></tr></table></body></html>`;
}

/** Mensaje con formato → HTML de correo con la marca de Pitsneakers. Todo el contenido va escapado. */
export function renderEmailHtml(subject: string, body: string, opts?: { unsubscribeUrl?: string }): string {
  const wa = `https://wa.me/${siteConfig.whatsappNumber}`;
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const logo = base ? `${base}/email/logo.png` : "";

  // Diseños limpios (minimal, grilla, noir): una línea [diseno: …] cambia todo el correo a otra presentación.
  const lines = body.split(/\r?\n/);
  const theme = luxThemeOf(lines);
  if (theme) return renderLuxHtml(subject, body, theme, opts);

  // El primer titular (# ...) sube a un bloque oscuro grande: lo primero que se ve al abrir el correo.
  const first = lines.findIndex((l) => l.trim() !== "");
  const heroLine = first >= 0 && lines[first].trim().startsWith("# ") ? lines[first].trim().slice(2) : "";
  const rest = heroLine ? lines.slice(first + 1).join("\n") : lines.join("\n");

  const pill = (href: string, label: string, bg: string, fg = "#ffffff") =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 6px 8px 0;padding:9px 16px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none">${label}</a>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${INK};font-family:${FONT};color:#1a1a1a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK}"><tr><td align="center" style="padding:22px 10px 30px">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;border-radius:18px;overflow:hidden;background:#ffffff">
<tr><td style="background:${INK};padding:22px 30px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${logo ? `<td width="62" valign="middle" style="padding-right:14px"><img src="${esc(logo)}" width="56" height="56" alt="" style="display:block;border:0;border-radius:14px"></td>` : ""}
<td valign="middle" style="font-family:${DISPLAY};font-size:34px;letter-spacing:2px;line-height:1;color:#ffffff">PIT<span style="color:${HOT}">SNEAKERS</span>
<div style="margin-top:7px;font-family:${FONT};font-size:10px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#9a9a9a">Verificados &#10022; Cultura &#10022; Comunidad</div></td>
</tr></table></td></tr>
<tr><td>${stripe(6)}</td></tr>
${
  heroLine
    ? `<tr><td style="background:${INK};padding:34px 30px 30px"><h1 style="margin:0;font-family:${DISPLAY};font-size:48px;line-height:1;letter-spacing:.5px;text-transform:uppercase;color:#ffffff;font-weight:normal">${inline(heroLine, "#ffd23f")}</h1><table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr><td style="width:70px;height:6px;background:${HOT};font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>`
    : ""
}
<tr><td style="padding:32px 30px 14px">${blocks(rest)}</td></tr>
<tr><td>${stripe(4)}</td></tr>
<tr><td style="background:${INK};padding:26px 30px 24px;font-size:12px;line-height:1.7;color:#bdbdbd">
<div style="font-family:${DISPLAY};font-size:22px;letter-spacing:1.5px;color:#ffffff;margin-bottom:4px">PIT<span style="color:${HOT}">SNEAKERS</span></div>
<div style="margin-bottom:14px;color:#9a9a9a">${esc(siteConfig.city)} &middot; Sneakers y streetwear verificados par a par</div>
<div>${pill(wa, "WhatsApp", "#25d366")}${pill(siteConfig.instagramUrl, "Instagram", "#ff6b9d", "#0a0a0a")}${pill(siteConfig.whatsappCommunityUrl, "Comunidad", "#4cc9f0", "#0a0a0a")}</div>
<div style="margin-top:8px;color:#7a7a7a">Recibes este correo porque haces parte de la comunidad Pitsneakers. ${
    opts?.unsubscribeUrl
      ? `Si ya no quieres recibir estos correos, <a href="${esc(opts.unsubscribeUrl)}" style="color:#ffffff;text-decoration:underline">date de baja aquí</a>.`
      : "Si ya no quieres recibir mensajes, responde &ldquo;NO&rdquo; a este correo."
  }</div>
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Versión de texto plano (sin marcas de formato) para clientes de correo que no muestran HTML. */
export function renderEmailText(body: string): string {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      const btn = t.match(/^\[boton:\s*(.+?)\s*\|\s*(\S+?)\s*\]$/i);
      if (btn) return `${btn[1]}: ${btn[2]}`;
      if (t === "---") return "";
      if (/^\[producto:/i.test(t)) {
        const p = parseProduct(t);
        return p ? [p.name, p.detail].filter(Boolean).join(" · ") : "";
      }
      if (/^\[fotos:/i.test(t)) return "Fotos de tu par (las ves en el correo con imágenes o en la página de tu pedido).";
      if (/^\[(diseno|imagen):/i.test(t)) return "";
      if (/^\[par:/i.test(t)) {
        const [, brand = "", name = "", detail = "", price = "", href = ""] = cells(t);
        return [[brand, name].filter(Boolean).join(" "), [detail, price].filter(Boolean).join(" · "), isHttps(href) ? href : ""].filter(Boolean).join("\n");
      }
      if (/^\[etiqueta:/i.test(t)) return cells(t)[0] ?? "";
      if (/^\[tarjeta:/i.test(t)) {
        const [, title = "", text = "", , href = ""] = cells(t);
        return [title, text, isHttps(href) ? href : ""].filter(Boolean).join("\n");
      }
      if (/^\[paso:/i.test(t)) {
        const s = parseStep(t);
        return s ? `${s.state === "ok" ? "✓" : "○"} ${s.title}${s.text ? ` — ${s.text}` : ""}${s.extra ? ` (${s.extra})` : ""}` : "";
      }
      return line
        .replace(/^\s*#{1,2}\s+/, "")
        .replace(/^\s*>\s?/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/==(.+?)==/g, "$1");
    })
    .join("\n");
}

/* ---------- Plantillas incluidas ---------- */

/** Sube este número cuando cambies los textos de abajo: las plantillas que no editaste se actualizan solas. */
export const TEMPLATE_VERSION = 11;

const cop = (n: number) => `$${n.toLocaleString("es-CO")}`;

export interface TemplateData {
  key: string;
  name: string;
  subject: string;
  body: string;
  builtin: boolean;
}

export const DEFAULT_TEMPLATES: TemplateData[] = [
  {
    key: "novedades",
    name: "🔥 Pares nuevos (novedades)",
    subject: "🔥 Cayeron pares nuevos en {{tienda}}",
    body: `# ==Pares nuevos== en el stock

Hola {{nombre}},

Esta semana entraron pares que no se ven todos los días, y cada uno fue **verificado por nuestro equipo** antes de publicarse.

> **Lo bueno dura poco.** Los pares únicos se van en horas. Si ves uno que te gusta, sepáralo ya.

[boton: Ver lo nuevo | {{web}}]

- Autenticidad verificada, par por par
- Tallas US claras en cada publicación
- Separa el tuyo por WhatsApp en un minuto

Nos vemos en la calle,
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "promo_flash",
    name: "⚡ Promo flash",
    subject: "⚡ {{concepto}} a {{monto}} — hasta {{fecha_limite}}",
    body: `# ==Promo flash== solo para ti

Hola {{nombre}},

Te avisamos primero porque eres de la comunidad:

> **{{concepto}}**
> Precio especial: **{{monto}}**
> Vigente hasta: **{{fecha_limite}}**

Cuando se acaba, se acaba. Escríbenos y te lo separamos.

[boton: Lo quiero | {{whatsapp}}]

Con cariño sneakerhead,
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "encargo_vip",
    name: "✨ Invitación a encargos VIP",
    subject: "¿Buscas ese par imposible, {{nombre}}?",
    body: `# ¿Ese par que ==no encuentras==?

Hola {{nombre}},

Si es de lanzamiento, colaboración o edición limitada, **lo conseguimos por encargo**. Tú nos dices cuál, nosotros lo buscamos, lo verificamos y te lo entregamos.

## Así funciona
- Nos cuentas modelo, talla y presupuesto
- Lo rastreamos con nuestra red de proveedores
- Pasa por verificación física antes de llegar a tus manos

[boton: Hacer mi encargo | {{whatsapp}}]

Cuéntanos qué sueñas calzar.
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "gracias_compra",
    name: "🙌 Gracias por tu compra",
    subject: "Gracias por tu compra, {{nombre}} 🙌",
    body: `# ¡==Gracias== por la confianza!

Hola {{nombre}},

Tu compra de **{{concepto}}** nos alegra el día. Esperamos que lo disfrutes y lo luzcas como se merece.

> **Cuéntanos cómo te fue.** Etiquétanos en Instagram con tu par puesto y te damos visibilidad en la comunidad.

[boton: Etiquétanos en Instagram | {{instagram}}]

¿Algo no quedó perfecto? Escríbenos y lo resolvemos: {{whatsapp}}

Hasta la próxima,
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "reactivar_cliente",
    name: "👋 Te extrañamos (reactivar cliente)",
    subject: "{{nombre}}, te guardamos algo bueno 👀",
    body: `# Hace rato ==no te vemos==

Hola {{nombre}},

Han llegado pares nuevos desde tu última visita y pensamos en ti. Pásate a ver qué hay: puede que tu talla esté esperando.

[boton: Ver el catálogo | {{web}}]

Y si buscas algo específico, escríbenos y te ayudamos a encontrarlo: {{whatsapp}}

Un abrazo,
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "comunidad",
    name: "💬 Únete a la comunidad",
    subject: "Entra a la comunidad {{tienda}} 💬",
    body: `# Únete a la ==comunidad==

Hola {{nombre}},

Más de 6.000 sneakerheads comparten pares, lanzamientos y oportunidades en nuestros grupos de WhatsApp. Ahí te enteras primero de todo.

- Pares nuevos antes que en la página
- Lanzamientos y alertas de precio
- Gente que sabe del tema para resolver tus dudas

[boton: Entrar a la comunidad | {{comunidad}}]

Te esperamos adentro,
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "recordatorio_pago",
    name: "💸 Recordatorio de pago",
    subject: "Recordatorio de pago — {{concepto}}",
    body: `# Un ==recordatorio== amigable

Hola {{nombre}},

Pasamos a recordarte este pago pendiente:

> **Concepto:** {{concepto}}
> **Valor:** {{monto}}
> **Fecha límite:** {{fecha_limite}}

Cuando lo hagas, mándanos el comprobante por WhatsApp para confirmarlo al instante.

[boton: Enviar comprobante | {{whatsapp}}]

Gracias por tu puntualidad,
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "pago_vencido",
    name: "⏰ Pago vencido",
    subject: "Tu pago está vencido — {{concepto}}",
    body: `# Tu pago ==ya venció==

Hola {{nombre}},

Notamos que este pago pasó su fecha límite ({{fecha_limite}}):

> **Concepto:** {{concepto}}
> **Valor:** {{monto}}

Si ya lo hiciste, envíanos el comprobante y lo actualizamos enseguida. Si necesitas más tiempo, cuéntanos y lo acordamos sin problema.

[boton: Hablar con nosotros | {{whatsapp}}]

Gracias por tu atención,
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "pago_recibido",
    name: "✅ Pago recibido",
    subject: "✅ Pago recibido — {{concepto}}",
    body: `# ¡Pago ==recibido==!

Hola {{nombre}},

Confirmamos tu pago. Gracias, de verdad.

> **Concepto:** {{concepto}}
> **Valor recibido:** {{monto}}

Si necesitas algo más, estamos a un mensaje de distancia.

[boton: Escribirnos | {{whatsapp}}]

**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "pedido_confirmado",
    name: "📦 Pedido confirmado",
    subject: "Pedido confirmado — {{concepto}}",
    body: `# Tu pedido está ==confirmado==

Hola {{nombre}},

¡Listo! Ya tenemos tu pedido en marcha:

> **{{concepto}}**
> **Valor:** {{monto}}

Te avisamos apenas esté listo para entrega. Si quieres coordinar algo mientras tanto, aquí estamos.

[boton: Coordinar por WhatsApp | {{whatsapp}}]

**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "pedido_listo",
    name: "🚀 Tu par está listo",
    subject: "🚀 ¡Tu par está listo, {{nombre}}!",
    body: `# ¡Tu par está ==listo==!

Hola {{nombre}},

**{{concepto}}** ya pasó la verificación y está listo para entrega.

> Coordinemos la entrega o el envío por WhatsApp para que lo tengas cuanto antes.

[boton: Coordinar entrega | {{whatsapp}}]

Gracias por elegirnos,
**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "bienvenida_revendedor",
    name: "🤝 Bienvenida a revendedores",
    subject: "Bienvenido a {{tienda}}, {{nombre}} 🤝",
    body: `# Tu stock, ==bajo control==

Hola {{nombre}},

Ya tienes tu panel de revendedor en {{tienda}}. Desde ahí llevas el control real de tu negocio:

- Registra **cuánto pagaste** por cada par y su talla
- Fija **cuánto esperas cobrar** y mira tu utilidad al instante
- Detecta los pares **estancados** antes de que te cuesten plata
- Copia tu lista de disponibles lista para WhatsApp

> **Para empezar:** agrega tus primeros pares o impórtalos desde Excel (CSV) en un solo paso.

[boton: Ir a mi panel | {{web}}]

Cualquier duda, escríbenos: {{whatsapp}}

**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "sube_tu_stock",
    name: "📦 Sube tu stock (revendedor sin artículos)",
    subject: "📦 {{nombre}}, sube tu stock a {{tienda}}",
    body: `# ==Sube tu stock== y empieza a vender

Hola {{nombre}},

Ya tienes tu cuenta de revendedor en {{tienda}}, pero todavía no has cargado ningún artículo. En unos minutos lo dejas listo:

- Entra a **Inventario → Agregar artículos**
- Elige si es **tenis, ropa o accesorio**
- Busca el modelo: si está en nuestro catálogo, se llenan solas la marca y la foto. Toca tu talla y sigue
- Escribe **cuánto pagaste** y **cuánto esperas cobrar**: ves en vivo **cuánto te llega** y cuál es tu utilidad

> **Así se calcula lo que recibes.** En pares, la comisión es de ${cop(siteConfig.commission.tenis.fixed)} fijos más un envío aproximado de ${cop(siteConfig.commission.tenis.shipping)}. En ropa y accesorios, el ${siteConfig.commission.ropa.percent}% del precio. Todo se descuenta de lo que cobras.

**¿Quieres que lo publiquemos en la página?** Cuando cargues tus artículos, escríbenos por WhatsApp con la foto, la talla y el precio, y lo subimos al catálogo con tu nombre de vendedor.

[boton: Subir mi stock | {{web}}/revendedores/inventario]

Si prefieres cargar muchos de una vez, puedes importarlos desde Excel (CSV) en el mismo panel. Y si algo no te cuadra, escríbenos: {{whatsapp}}

**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "stock_inactivo",
    name: "📈 Actualiza tu stock (revendedor inactivo)",
    subject: "¿Cómo va tu stock, {{nombre}}? 📈",
    body: `# ¿Cómo va ese ==stock==?

Hola {{nombre}},

Hace unos días no vemos movimiento en tu panel. Un par de minutos ahí te ahorran dolores de cabeza:

- Marca lo que ya **vendiste** para ver tu ganancia real
- Revisa los pares **estancados** y ajusta precios
- Actualiza tus **precios esperados** según el mercado

[boton: Abrir mi panel | {{web}}]

Si algo no te funciona, cuéntanos y lo mejoramos: {{whatsapp}}

**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "oferta_par",
    name: "💰 Oferta por un par (revendedor)",
    subject: "💰 Oferta por tu {{concepto}}: {{monto}}",
    body: `# Te =={{monto}}== por tu par

Hola {{nombre}},

Llegó una oferta por **{{concepto}}**:

> **Oferta:** {{monto}}
> **Vigente hasta:** {{fecha_limite}}

Entra a tu panel: ahí ves tu utilidad con este precio y puedes **aceptarla, contraofertar o rechazarla** con un toque.

[boton: Ver y responder la oferta | {{web}}/revendedores/ofertas]

¿Dudas? Escríbenos: {{whatsapp}}

**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "stock_cargado",
    name: "📦 Tu stock ya quedó cargado (revendedor)",
    subject: "Ya quedó cargado tu stock en {{tienda}}",
    body: `# Tu stock ==ya quedó cargado==

Hola {{nombre}},

Ya cargamos tu stock en {{tienda}}:

> **Par:** {{concepto}}
> **Talla:** {{talla}}
> **Esperas recibir:** {{monto}}

Es lo que te queda al venderlo al precio publicado, ya descontada nuestra comisión.

[boton: Ver mi inventario | {{web}}/revendedores/inventario]

Entra a tu panel para poner lo que te costó cada par y ver tu utilidad real. ¿Algo no cuadra? Escríbenos: {{whatsapp}}

**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "black_friday_revendedor",
    name: "🖤 Black Friday viene: vende tu stock (revendedor)",
    subject: "🖤 {{nombre}}, llegó el momento de vender tu stock en el Black Friday de {{tienda}}",
    body: `# Llegó el momento de ==vender== tu stock

Hola {{nombre}},

Si tienes pares guardados de este año, **este es el momento de moverlos**. Del **viernes 27 al lunes 30 de noviembre** es el Black Friday de {{tienda}}: los días con más compradores del año. Aprovéchala para **recuperar tu inversión** y liberar plata para tu próximo par.

> **Vamos a empujarlo con pauta en redes y con toda la comunidad.** Y todo par que sale en Black Friday va con **envío incluido y verificación incluida** para el comprador: eso da confianza y hace que se venda más rápido.

**Tú escoges qué pares ofreces y a qué precio.** Nosotros revisamos cada propuesta y aprobamos las que entran. Desde tu panel:

- Entra a **Inventario** y toca **Ofrecer pares en Black Friday**
- Ponle a cada par el **precio con descuento** que quieras. Ves en vivo cuánto te llega
- Toca **Enviar para aprobación**. Te avisamos en el panel cuando lo aprobemos
- Mientras más descuento, más fácil que se venda: la gente busca las mejores ofertas

La comisión **no cambia**: recibes el precio que pongas menos la comisión y el envío. Cuando termina la campaña, tus pares vuelven solos a su precio normal, sin que hagas nada.

[boton: Escoger mis pares | {{web}}/revendedores/black-friday]

**Hazlo hoy o mañana**: entre más temprano quede aprobado tu par, más días se muestra. ¿Todavía no tienes pares en tu inventario? Súbelos y escríbenos: {{whatsapp}}

**Equipo {{tienda}}**`,
    builtin: true,
  },
  {
    key: "aviso_general",
    name: "📝 Aviso general (en blanco)",
    subject: "Mensaje de {{tienda}}",
    body: `# Un mensaje de =={{tienda}}==

Hola {{nombre}},

Escribe aquí tu mensaje.

[boton: Escríbenos | {{whatsapp}}]

**Equipo {{tienda}}**`,
    builtin: true,
  },
  // Flujo de Navidad (5 correos): el texto vive en campaign-templates.ts para que la pantalla de campañas use el mismo.
  ...CAMPAIGN_TEMPLATES.filter((t) => t.key.startsWith("navidad-")).map(
    (t): TemplateData => ({ key: t.key.replace("-", "_"), name: `🎄 ${t.name}`, subject: t.subject, body: t.body, builtin: true }),
  ),
];
