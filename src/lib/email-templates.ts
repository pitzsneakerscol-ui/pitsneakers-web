// Plantillas de correo y reemplazo de variables. Seguro para cliente y servidor.

export const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: "nombre", label: "Nombre del destinatario" },
  { key: "monto", label: "Monto (ej. $350.000)" },
  { key: "concepto", label: "Concepto del pago o pedido" },
  { key: "fecha_limite", label: "Fecha límite" },
  { key: "tienda", label: "Pitsneakers" },
  { key: "whatsapp", label: "Link de WhatsApp de la tienda" },
];

export interface TemplateData {
  key: string;
  name: string;
  subject: string;
  body: string;
  builtin: boolean;
}

export const DEFAULT_TEMPLATES: TemplateData[] = [
  {
    key: "recordatorio_pago",
    name: "Recordatorio de pago pendiente",
    subject: "Recordatorio de pago — {{concepto}}",
    body: `Hola {{nombre}},

Te escribimos de {{tienda}} para recordarte que tienes un pago pendiente:

• Concepto: {{concepto}}
• Valor: {{monto}}
• Fecha límite: {{fecha_limite}}

Cuando hagas el pago, envíanos el comprobante por WhatsApp para confirmarlo: {{whatsapp}}

¡Gracias!
Equipo {{tienda}}`,
    builtin: true,
  },
  {
    key: "pago_vencido",
    name: "Pago vencido",
    subject: "Tu pago está vencido — {{concepto}}",
    body: `Hola {{nombre}},

Notamos que el siguiente pago ya pasó su fecha límite ({{fecha_limite}}):

• Concepto: {{concepto}}
• Valor: {{monto}}

Si ya lo pagaste, mándanos el comprobante y lo actualizamos enseguida. Si necesitas más tiempo o tienes alguna duda, escríbenos: {{whatsapp}}

Equipo {{tienda}}`,
    builtin: true,
  },
  {
    key: "pago_recibido",
    name: "Confirmación de pago recibido",
    subject: "Pago recibido — {{concepto}}",
    body: `Hola {{nombre}},

Confirmamos que recibimos tu pago de {{monto}} por "{{concepto}}". ¡Muchas gracias!

Cualquier cosa, estamos en WhatsApp: {{whatsapp}}

Equipo {{tienda}}`,
    builtin: true,
  },
  {
    key: "pedido_confirmado",
    name: "Pedido o encargo confirmado",
    subject: "Confirmamos tu pedido — {{concepto}}",
    body: `Hola {{nombre}},

Tu pedido quedó confirmado:

• {{concepto}}
• Valor: {{monto}}

Te avisamos apenas esté listo para entrega. Si quieres coordinar algo, escríbenos: {{whatsapp}}

Equipo {{tienda}}`,
    builtin: true,
  },
  {
    key: "pedido_listo",
    name: "Tu par está listo",
    subject: "Tu par está listo para entrega",
    body: `Hola {{nombre}},

¡Buenas noticias! Tu pedido ({{concepto}}) ya pasó la verificación y está listo para entrega.

Coordinemos el envío o la entrega por WhatsApp: {{whatsapp}}

Equipo {{tienda}}`,
    builtin: true,
  },
  {
    key: "bienvenida_revendedor",
    name: "Bienvenida a revendedores",
    subject: "Bienvenido a {{tienda}}, {{nombre}}",
    body: `Hola {{nombre}},

Ya tienes tu panel de revendedor en {{tienda}}. Desde ahí puedes registrar cuánto pagaste por cada par, su talla, cuánto esperas cobrar y ver tu utilidad real.

Un consejo para empezar: importa tu inventario desde Excel (CSV) o agrégalo par por par.

Si tienes dudas, escríbenos: {{whatsapp}}

Equipo {{tienda}}`,
    builtin: true,
  },
  {
    key: "stock_inactivo",
    name: "Actualiza tu stock (revendedor inactivo)",
    subject: "¿Cómo va tu stock, {{nombre}}?",
    body: `Hola {{nombre}},

Hace un tiempo no vemos movimiento en tu panel. Entra, marca lo que ya vendiste y revisa los pares estancados para ajustar precios.

Si algo no te funciona, cuéntanos por WhatsApp: {{whatsapp}}

Equipo {{tienda}}`,
    builtin: true,
  },
  {
    key: "novedades",
    name: "Novedades y promociones",
    subject: "Nuevos pares en {{tienda}}",
    body: `Hola {{nombre}},

Llegaron pares nuevos a {{tienda}}. Míralos en la web y separa el tuyo por WhatsApp antes de que vuele: {{whatsapp}}

Equipo {{tienda}}`,
    builtin: true,
  },
  {
    key: "aviso_general",
    name: "Aviso general (en blanco)",
    subject: "Mensaje de {{tienda}}",
    body: `Hola {{nombre}},

Escribe aquí tu mensaje.

Equipo {{tienda}}`,
    builtin: true,
  },
];

export type Vars = Record<string, string>;

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
