// Configuración central del sitio. Edita estos valores con los datos reales de Pitsneakers.
export const siteConfig = {
  name: "Pitsneakers",
  description:
    "Sneakers y streetwear verificados en Bogotá. Cada par pasa por revisión física y autenticación antes de publicarse. Compra en línea o haz tu oferta.",
  // Número de WhatsApp en formato internacional sin "+", ej: 573001234567
  whatsappNumber: "573115609644",
  // Correo donde llegan las consultas de los revendedores ("¿me recomiendan comprar este par?"). Debe existir como alias (ImprovMX).
  contactEmail: "info@pitsneakers.com",
  // Dirección pública de la página (ej: "https://pitsneakers.com"). Se usa en los correos;
  // si la dejas vacía, los botones "Ver el catálogo" apuntan a tu WhatsApp.
  siteUrl: "https://pitsneakers.com",
  whatsappCommunityUrl: "https://wa.me/message/LOOSS56K4XY6M1",
  instagramHandle: "@pitsneakers",
  instagramUrl: "https://instagram.com/pitsneakers",
  city: "Bogotá, Colombia",
  // Datos de la empresa (se muestran en el pie de página y en las políticas).
  legalName: "Pitsneakers SAS",
  nit: "901926970",
  // Link CSV de un Google Sheet publicado con el inventario (ver README).
  // Déjalo vacío ("") para seguir usando src/data/products.json.
  productsSheetUrl: "",
  // Lo que cobra Wompi por procesar un pago en línea (tarifa % + valor fijo, más IVA sobre eso). Verifica tu tarifa real en el panel de Wompi.
  // Se suma como "costo de pago en línea" al total cuando el cliente paga con Comprar ahora.
  onlineFee: {
    percent: 2.99,
    fixed: 900,
    iva: 19,
  },
  // Costo de envío a todo el país: se suma al total en el checkout, antes de pagar. Recoger en el punto de verificación de Bogotá no lo cobra.
  delivery: {
    fee: 24000,
  },
  // Ofertas de compradores: precio mínimo (% del precio), horas que tienes para responder y horas para pagar una oferta aceptada.
  offers: {
    minPercent: 70,
    replyHours: 72,
    payHours: 24,
    maxActive: 5,
  },
  // Punto de verificación donde los revendedores dejan el par vendido (va en la confirmación que se les manda desde el admin).
  verificationPoint: {
    city: "Bogotá",
    lines: ["PITSNEAKERS SAS", "Tel. 3115609644", "Calle 134A #55A-20", "Apto 601", "Boca Reserva", "Barrio Colina"],
  },
  // Lo que se le descuenta al vendedor. Pares: comisión fija + envío aproximado. Ropa y accesorios: un porcentaje.
  commission: {
    tenis: { fixed: 50000, shipping: 20000 },
    ropa: { percent: 15, shipping: 0 },
  },
  stats: {
    whatsappMembers: "6,000+",
    instagramFollowers: "15K",
    whatsappGroups: 6,
  },
  promo: {
    // Poné en false para ocultar la sección de promo sin borrar nada.
    enabled: true,
    title: "Sale de apertura",
    subtitle: "Pares y prendas seleccionados con precio especial por la apertura de la página.",
    // Fecha y hora exacta en que termina (zona horaria Colombia, -05:00). Vacío = sin fecha de cierre ni cuenta regresiva.
    endsAt: "",
  },
  // Campañas con fecha (Black Friday, etc.). Entran y salen solas según la hora: no hay que tocar nada el día de la campaña.
  // Fechas en hora de Colombia (-05:00). Mientras una campaña está vigente, reemplaza al "promo" de arriba en /sale, el inicio, la barra de anuncios y el menú.
  // Los precios con descuento los pones por par en Admin → Precios (precio anterior); la campaña solo pone el marco: título, cuenta regresiva y página.
  campaigns: [
    {
      id: "pre-black-friday",
      name: "Pre Black Friday",
      kicker: "Acceso anticipado",
      title: "Pre Black Friday",
      subtitle: "Antes que nadie: pares seleccionados con precio de Black Friday, solo hasta que arranque el viernes.",
      startsAt: "2026-11-23T00:00:00-05:00",
      endsAt: "2026-11-27T00:00:00-05:00",
    },
    {
      id: "black-friday",
      name: "Black Friday",
      kicker: "Oferta por tiempo limitado",
      title: "Black Friday",
      subtitle: "Tres días de precios especiales en sneakers y streetwear verificados. Cuando se acaba el par, se acaba la oferta.",
      startsAt: "2026-11-27T00:00:00-05:00",
      endsAt: "2026-11-30T00:00:00-05:00",
    },
    {
      id: "cyber-monday",
      name: "Cyber Monday",
      kicker: "Último día",
      title: "Cyber Monday",
      subtitle: "Las últimas 24 horas de Black Friday: lo que queda, al mismo precio de la oferta.",
      startsAt: "2026-11-30T00:00:00-05:00",
      endsAt: "2026-12-01T00:00:00-05:00",
    },
  ] as Campaign[],
};

export interface Campaign {
  id: string;
  /** Nombre corto para el menú y los avisos. */
  name: string;
  /** Texto pequeño sobre el título. */
  kicker: string;
  title: string;
  subtitle: string;
  startsAt: string;
  endsAt: string;
}
