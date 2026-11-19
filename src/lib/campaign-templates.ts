// Plantillas de campañas de correo. Seguro para cliente y servidor.
// Variables: {{nombre}} (primer nombre del contacto), {{web}}, {{whatsapp}}, {{comunidad}}, {{instagram}}.
// Formato: # Titular (==palabra== en rojo), **negrita**, > caja destacada, - viñetas, [boton: Texto | enlace].
// Cada plantilla tiene su propio nombre de campaña: así cada contacto recibe cada correo del flujo una sola vez.

export interface CampaignTemplate {
  key: string;
  /** Nombre que se ve en la lista de plantillas. */
  name: string;
  /** Nombre de campaña sugerido (con él se recuerda a quién ya se le envió). */
  campaign: string;
  /** Cuándo conviene enviarla. */
  when: string;
  subject: string;
  body: string;
}

const utm = (campaign: string, path = "") => `{{web}}${path || "/"}?utm_source=correo&utm_medium=email&utm_campaign=${campaign}`;
const SIGN = "— El equipo de Pitsneakers";

// Foto de un par del catálogo lista para el correo, sobre el color de fondo del diseño (las fotos no tienen fondo propio):
// f5f5f5 para los diseños blancos (minimal y grilla) y 141414 para noir. Para usar una foto nueva, cambia la dirección https://… por la suya.
const foto = (file: string, w = 900, bg = "f5f5f5") => `{{web}}/api/email-foto?f=${file}&w=${w}&bg=${bg}`;
const link = (slug: string, campaign: string) => utm(campaign, `/producto/${slug}`);

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "minimal-lanzamiento",
    name: "⚪ Minimal · Lanzamiento (blanco, foto grande)",
    campaign: "minimal-lanzamiento",
    when: "Cuando llega un par o una colaboración que quieres anunciar a toda la lista. Limpio, mucho aire.",
    subject: "Ya llegó a Pitsneakers: Gel Kayano 12.1 x Vandy The Pink",
    body: `[diseno: minimal]

[imagen: ${foto("ASICS-21.4caff028.webp", 1100)} | Asics x Vandy The Pink Gel Kayano 12.1 Chocolate | ${link("asics-x-vandy-the-pink-gel-kayano-12-1-chocolate", "minimal-lanzamiento")}]

[etiqueta: Nuevo en Pitsneakers]

# Gel Kayano 12.1 "Chocolate"

Asics x Vandy The Pink. Talla 8.5 US, nuevo y verificado por nuestro equipo antes de publicarse.

[boton: Ver el par | ${link("asics-x-vandy-the-pink-gel-kayano-12-1-chocolate", "minimal-lanzamiento")}]

---

Hola {{nombre}}, casi todos nuestros pares son únicos: cuando se vende, se va. Si te gustó, sepáralo por WhatsApp.

[boton: Escribirnos por WhatsApp | {{whatsapp}}]`,
  },
  {
    key: "grilla-pares",
    name: "🟩 Grilla · Pares nuevos (estilo StockX, con precios)",
    campaign: "grilla-pares",
    when: "Cuando cargas varios pares y quieres mostrarlos en una sola cuadrícula, con talla y precio.",
    subject: "Pares nuevos en Pitsneakers",
    body: `[diseno: grilla]

[etiqueta: Nuevo en Pitsneakers]

# Lo que acaba de entrar

Hola {{nombre}}, estos pares llegaron esta semana. Todos verificados, par a par.

[par: ${foto("ASICS-21.4caff028.webp", 600)} | Asics x Vandy The Pink | Gel Kayano 12.1 Chocolate | Talla 8.5 US · Nuevo | $950.000 | ${link("asics-x-vandy-the-pink-gel-kayano-12-1-chocolate", "grilla-pares")}]
[par: ${foto("ASICS-20.d6a1aad2.webp", 600)} | Asics x Vandy The Pink | Gel Kayano 14 Vainilla | Talla 6.5 US · Nuevo | $1.100.000 | ${link("asics-x-vandy-the-pink-gel-kayano-14-vainilla", "grilla-pares")}]
[par: ${foto("SB-DUNK-01.6de7aed5.webp", 600)} | Nike | SB Dunk Low Rayssa Leal | Tallas 9 y 10 US · Nuevo | $1.100.000 | ${link("nike-sb-dunk-low-rayssa-leal", "grilla-pares")}]
[par: ${foto("AJ1-33.15595159.webp", 600)} | Jordan | Jordan 1 Hyper Royal | Talla 7 US · Nuevo | $1.100.000 | ${link("jordan-jordan-1-hyper-royal", "grilla-pares")}]

[boton: Ver todo el catálogo | ${utm("grilla-pares")}]`,
  },
  {
    key: "noir-lanzamiento",
    name: "⚫ Noir · Lanzamiento (oscuro, de lujo)",
    campaign: "noir-lanzamiento",
    when: "Para un par o colaboración que quieres que se sienta exclusivo. Versión oscura del lanzamiento.",
    subject: "Ya llegó a Pitsneakers: Gel Kayano 12.1 x Vandy The Pink",
    body: `[diseno: noir]

[imagen: ${foto("ASICS-21.4caff028.webp", 1100, "141414")} | Asics x Vandy The Pink Gel Kayano 12.1 Chocolate | ${link("asics-x-vandy-the-pink-gel-kayano-12-1-chocolate", "noir-lanzamiento")}]

[etiqueta: Asics x Vandy The Pink]

# Gel Kayano 12.1 "Chocolate"

Hola {{nombre}}. Talla 8.5 US, nuevo y verificado. Casi todos nuestros pares son únicos: si ves el tuyo, sepáralo.

[boton: Ver el par | ${link("asics-x-vandy-the-pink-gel-kayano-12-1-chocolate", "noir-lanzamiento")}]`,
  },
  {
    key: "noir-pares",
    name: "⚫ Noir · Pares nuevos (oscuro, en cuadrícula)",
    campaign: "noir-pares",
    when: "Varios pares en una cuadrícula, en versión oscura.",
    subject: "Pares nuevos en Pitsneakers",
    body: `[diseno: noir]

[etiqueta: Nuevo en Pitsneakers]

# Lo que acaba de entrar

Hola {{nombre}}, esto llegó esta semana. Todo verificado, par a par.

[par: ${foto("ASICS-21.4caff028.webp", 600, "141414")} | Asics x Vandy The Pink | Gel Kayano 12.1 Chocolate | Talla 8.5 US · Nuevo | $950.000 | ${link("asics-x-vandy-the-pink-gel-kayano-12-1-chocolate", "noir-pares")}]
[par: ${foto("ASICS-20.d6a1aad2.webp", 600, "141414")} | Asics x Vandy The Pink | Gel Kayano 14 Vainilla | Talla 6.5 US · Nuevo | $1.100.000 | ${link("asics-x-vandy-the-pink-gel-kayano-14-vainilla", "noir-pares")}]
[par: ${foto("SB-DUNK-01.6de7aed5.webp", 600, "141414")} | Nike | SB Dunk Low Rayssa Leal | Tallas 9 y 10 US · Nuevo | $1.100.000 | ${link("nike-sb-dunk-low-rayssa-leal", "noir-pares")}]
[par: ${foto("AJ1-33.15595159.webp", 600, "141414")} | Jordan | Jordan 1 Hyper Royal | Talla 7 US · Nuevo | $1.100.000 | ${link("jordan-jordan-1-hyper-royal", "noir-pares")}]

[boton: Ver todo el catálogo | ${utm("noir-pares")}]`,
  },
  {
    key: "bienvenida-web",
    name: "Pitsneakers ya tiene página web",
    campaign: "comunidad-web",
    when: "Cuando quieras: es el primer aviso a la comunidad.",
    subject: "Ya puedes ver todo el catálogo de Pitsneakers en la web",
    body: `# Pitsneakers ya tiene página web

Hola {{nombre}},

Hace un tiempo te registraste en la comunidad de Pitsneakers. Hoy queremos que **entres a la página** y veas lo que hay disponible.

> Sneakers y streetwear verificados, par a par.
> Cada par se revisa y se autentica antes de publicarse.

En la web puedes:

- Ver el catálogo completo con fotos reales de cada par
- Filtrar por marca, talla y precio
- Ver los lanzamientos y los pares en oferta
- Pedir por encargo el par que no encuentres

[boton: Entrar a Pitsneakers | ${utm("comunidad-web")}]

Cualquier duda, escríbenos por WhatsApp.

${SIGN}`,
  },
  {
    key: "navidad-1",
    name: "Navidad 1 de 5 · Escoge el regalo",
    campaign: "navidad-1-regalos",
    when: "Última semana de noviembre, antes del Black Friday.",
    subject: "🎄 Ya empezó la Navidad en Pitsneakers: escoge tu regalo",
    body: `# ==Navidad== en Pitsneakers

Hola {{nombre}},

Diciembre está a la vuelta de la esquina y en la página ya puedes escoger el regalo de esta Navidad. Para otra persona o para ti, que también vale.

> Casi todos los pares son únicos: los verificamos y autenticamos uno por uno antes de publicarlos. Cuando se vende, se va.

Así de fácil:

- Entra al catálogo y filtra por marca, talla y precio
- Mira las fotos reales de cada par
- Compra en línea o escríbenos por WhatsApp y te ayudamos a escoger
- Cada par que compras suma puntos a tu colección y te sube de liga, con beneficios

[boton: Ver el catálogo | ${utm("navidad-1")}]

¿Es un regalo y no sabes la talla? Escríbenos y lo resolvemos juntos.

${SIGN}`,
  },
  {
    key: "navidad-2",
    name: "Navidad 2 de 5 · Haz tu oferta",
    campaign: "navidad-2-oferta",
    when: "Viernes o fin de semana del Black Friday (última semana de noviembre).",
    subject: "¿Te gusta un par pero quieres mejor precio? Haz tu oferta",
    body: `# Propón ==tu precio==

Hola {{nombre}},

En Pitsneakers no tienes que pagar siempre el precio de la etiqueta. En cada par publicado puedes **hacer tu oferta**.

> Puedes ofertar desde el 70% del precio. Nosotros te respondemos y, si la aceptamos, la pagas en línea desde tu cuenta.

Cómo funciona:

- Crea tu cuenta gratis y verifica tu correo
- Entra a un par que te guste y toca “Hacer una oferta”
- Escribe el precio que quieres pagar
- Te respondemos en máximo 72 horas: la aceptamos o te mandamos una contraoferta

Y hay más: cada par que compras en Pitsneakers suma puntos a tu colección y te sube de liga, de Bronce a Diamante. En las ligas altas puedes ofertar desde el 60% y tienes hasta 72 horas para pagar.

Si quieres ver de una vez los pares con precio especial, mira la sección Sale.

[boton: Crear mi cuenta | ${utm("navidad-2", "/cuenta/ingresar")}]
[boton: Ver pares en Sale | ${utm("navidad-2", "/sale")}]

${SIGN}`,
  },
  {
    key: "navidad-3",
    name: "Navidad 3 de 5 · Llegó la prima",
    campaign: "navidad-3-prima",
    when: "Mitad de diciembre, cuando llega la prima (alrededor del 14 o 15).",
    subject: "Llegó la prima: el momento de estrenar 👟",
    body: `# Llegó la ==prima==

Hola {{nombre}},

Si hay un par que llevas meses mirando, diciembre es el momento. Entra a la página y míralo con calma: fotos reales, talla y precio claros.

> ¿No lo encuentras? Con **Encargos VIP** nos dices qué buscas y tu talla. Movemos tu pedido entre nuestros vendedores de confianza y los grupos de la comunidad, y te avisamos apenas aparece.

Dos formas de conseguirlo:

- Si ya está publicado, cómpralo en línea
- Si no, haz tu encargo y lo buscamos por ti

[boton: Ver el catálogo | ${utm("navidad-3")}]
[boton: Hacer un encargo | ${utm("navidad-3", "/encargos")}]

${SIGN}`,
  },
  {
    key: "navidad-4",
    name: "Navidad 4 de 5 · Últimos días",
    campaign: "navidad-4-ultimos-dias",
    when: "Entre el 17 y el 18 de diciembre.",
    subject: "Últimos días para pedir tu regalo a tiempo 🎁",
    body: `# Pídelo ==hoy==

Hola {{nombre}},

Se acerca el 24 y entre más temprano pidas, más fácil es que tu regalo llegue a tiempo.

> Cada par es único. Si ya tienes uno elegido, no lo dejes para el último día.

Esto es lo que pasa cuando compras:

- Escoges tu par y pagas en línea
- Un asesor te escribe por WhatsApp para confirmar tu dirección, el valor del envío y el tiempo estimado de entrega
- Si estás en Bogotá, podemos coordinar entrega directa

Compras tranquilo: pares verificados y derecho de retracto de 5 días hábiles después de recibirlos.

[boton: Escoger mi regalo | ${utm("navidad-4")}]

¿Dudas con tu talla o con el envío a tu ciudad? Escríbenos por WhatsApp y te contamos.

${SIGN}`,
  },
  {
    key: "navidad-5",
    name: "Navidad 5 de 5 · Estrena el año",
    campaign: "navidad-5-estrena",
    when: "Entre el 27 y el 29 de diciembre.",
    subject: "Estrena el año con un par nuevo 🎆",
    body: `# ==Año nuevo==, par nuevo

Hola {{nombre}},

Pasó la Navidad, pero la página sigue abierta. Si no alcanzaste a escoger tu par, o te quedó el aguinaldo para estrenar, aquí sigues a tiempo.

> Todo lo que publicamos pasa por revisión y autenticación. Compras en línea, con las mismas garantías de siempre.

Para empezar el año:

- Mira lo que hay disponible en el catálogo
- Haz tu oferta en el par que te guste
- Revisa tu liga: cada compra suma puntos a tu colección
- Únete a la comunidad de WhatsApp para enterarte de los lanzamientos primero

[boton: Ver el catálogo | ${utm("navidad-5")}]
[boton: Unirme a la comunidad | {{comunidad}}]

¡Que el año nuevo llegue con buenos pares!

${SIGN}`,
  },
];
