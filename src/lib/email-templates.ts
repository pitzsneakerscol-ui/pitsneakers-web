// Plantillas de correo, formato y reemplazo de variables. Seguro para cliente y servidor.
import { siteConfig } from "@/config/site";

/* ---------- Variables ---------- */

export const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: "nombre", label: "Nombre del destinatario" },
  { key: "monto", label: "Monto (ej. $350.000)" },
  { key: "concepto", label: "Concepto, producto o pedido" },
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
function inline(raw: string, mark = ACCENT): string {
  let s = esc(raw);
  s = s.replace(/https:\/\/[^\s<]+/g, (url) => {
    const m = url.match(/[.,;:!?)]+$/);
    const tail = m ? m[0] : "";
    const clean = tail ? url.slice(0, -tail.length) : url;
    return `<a href="${clean}" style="color:${ACCENT};font-weight:bold">${clean}</a>${tail}`;
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

function blocks(body: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  let list: string[] = [];

  const flush = () => {
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
    } else if (/^\[boton:/i.test(t)) {
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

/** Mensaje con formato → HTML de correo con la marca de Pitsneakers. Todo el contenido va escapado. */
export function renderEmailHtml(subject: string, body: string): string {
  const wa = `https://wa.me/${siteConfig.whatsappNumber}`;
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const logo = base ? `${base}/email/logo.png` : "";

  // El primer titular (# ...) sube a un bloque oscuro grande: lo primero que se ve al abrir el correo.
  const lines = body.split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim() !== "");
  const heroLine = first >= 0 && lines[first].trim().startsWith("# ") ? lines[first].trim().slice(2) : "";
  const rest = heroLine ? lines.slice(first + 1).join("\n") : body;

  const pill = (href: string, label: string, bg: string, fg = "#ffffff") =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 6px 8px 0;padding:9px 16px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none">${label}</a>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${INK};font-family:${FONT};color:#1a1a1a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK}"><tr><td align="center" style="padding:22px 10px 30px">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;border-radius:18px;overflow:hidden;background:#ffffff">
<tr><td style="background:${INK};padding:22px 30px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${logo ? `<td width="62" valign="middle" style="padding-right:14px"><img src="${esc(logo)}" width="56" height="56" alt="" style="display:block;border:0"></td>` : ""}
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
<div style="margin-top:8px;color:#7a7a7a">Recibes este correo porque haces parte de la comunidad Pitsneakers. Si ya no quieres recibir mensajes, responde &ldquo;NO&rdquo; a este correo.</div>
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
export const TEMPLATE_VERSION = 4;

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
];
