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
const PAPER = "#f1eee8";
const FONT = "Arial,Helvetica,sans-serif";
const DISPLAY = "Impact,'Arial Narrow',Arial,sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isHttps = (u: string) => /^https:\/\/[^\s"'<>]+$/.test(u);

function inline(raw: string): string {
  let s = esc(raw);
  s = s.replace(/https:\/\/[^\s<]+/g, (url) => {
    const m = url.match(/[.,;:!?)]+$/);
    const tail = m ? m[0] : "";
    const clean = tail ? url.slice(0, -tail.length) : url;
    return `<a href="${clean}" style="color:${ACCENT};font-weight:bold">${clean}</a>${tail}`;
  });
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/==(.+?)==/g, `<span style="color:${ACCENT}">$1</span>`);
  return s;
}

function blocks(body: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (para.length) {
      out.push(
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#222">${para.map(inline).join("<br>")}</p>`
      );
      para = [];
    }
    if (quote.length) {
      out.push(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px"><tr><td style="background:${PAPER};border-left:5px solid ${ACCENT};border-radius:6px;padding:16px 18px;font-size:15px;line-height:1.6;color:#222">${quote.map(inline).join("<br>")}</td></tr></table>`
      );
      quote = [];
    }
    if (list.length) {
      out.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px">${list
          .map(
            (li) =>
              `<tr><td style="padding:3px 10px 3px 0;color:${ACCENT};font-size:16px;vertical-align:top">&#9656;</td><td style="padding:3px 0;font-size:15px;line-height:1.55;color:#222">${inline(li)}</td></tr>`
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
        `<h2 style="margin:8px 0 12px;font-family:${DISPLAY};font-size:24px;line-height:1.15;letter-spacing:.5px;text-transform:uppercase;color:${INK};font-weight:normal">${inline(t.slice(3))}</h2>`
      );
    } else if (t.startsWith("# ")) {
      flush();
      out.push(
        `<h1 style="margin:0 0 18px;font-family:${DISPLAY};font-size:40px;line-height:1.02;letter-spacing:.5px;text-transform:uppercase;color:${INK};font-weight:normal">${inline(t.slice(2))}</h1>`
      );
    } else if (t === "---") {
      flush();
      out.push(`<hr style="border:none;border-top:1px solid #e4dfd6;margin:22px 0">`);
    } else if (/^\[boton:/i.test(t)) {
      flush();
      const m = t.match(/^\[boton:\s*(.+?)\s*\|\s*(\S+?)\s*\]$/i);
      if (m && isHttps(m[2])) {
        out.push(
          `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:${ACCENT};border-radius:999px"><a href="${m[2]}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:14px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;text-decoration:none">${esc(m[1])} &rarr;</a></td></tr></table>`
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
  const link = (href: string, label: string) =>
    `<a href="${esc(href)}" style="color:#ffffff;text-decoration:underline">${esc(label)}</a>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};font-family:${FONT};color:#222">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:14px;overflow:hidden;background:#ffffff">
<tr><td style="background:${INK};padding:22px 32px;font-family:${DISPLAY};font-size:30px;letter-spacing:1.5px;color:#ffffff">PIT<span style="color:${ACCENT}">SNEAKERS</span></td></tr>
<tr><td style="background:${ACCENT};padding:8px 32px;font-size:11px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#ffffff">Verificados &#10022; Cultura &#10022; Comunidad</td></tr>
<tr><td style="padding:34px 32px 18px">${blocks(body)}</td></tr>
<tr><td style="background:${INK};padding:24px 32px;font-size:12px;line-height:1.7;color:#bdbdbd">
<strong style="color:#ffffff;font-size:13px">${esc(siteConfig.name)}</strong> &middot; ${esc(siteConfig.city)}<br>
${link(wa, "WhatsApp")} &nbsp;&middot;&nbsp; ${link(siteConfig.instagramUrl, "Instagram")} &nbsp;&middot;&nbsp; ${link(siteConfig.whatsappCommunityUrl, "Comunidad")}<br>
<span style="color:#8a8a8a">Recibes este correo porque haces parte de la comunidad Pitsneakers. Si ya no quieres recibir mensajes, responde &ldquo;NO&rdquo; a este correo.</span>
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
export const TEMPLATE_VERSION = 2;

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
