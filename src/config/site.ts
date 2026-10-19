// Configuración central del sitio. Edita estos valores con los datos reales de Pitsneakers.
export const siteConfig = {
  name: "Pitsneakers",
  description:
    "Comunidad de reventa de sneakers y streetwear en Bogotá. Consignación verificada — cada par pasa por revisión física y autenticación antes de publicarse.",
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
  // Ofertas de compradores: precio mínimo (% del precio), horas que tienes para responder y horas para pagar una oferta aceptada.
  offers: {
    minPercent: 70,
    replyHours: 72,
    payHours: 24,
    maxActive: 5,
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
};
