// Textos y reglas del bot de WhatsApp. Edita aquí lo que el bot dice; no hay que tocar el código.
// Sin dependencias del servidor: lo usa la lógica del bot y el admin.

export const botConfig = {
  /** Lo que se cobra por publicar un par en la comunidad y en la página. */
  publishFee: 10000,

  /**
   * Beneficios de publicar (se muestran tal cual). Revisa que cada línea sea cierta antes de activar el bot.
   * Salen de lo que ya dice la página: comunidad, verificación, panel de vendedor y pago al vender.
   */
  publishBenefits: [
    "Tu par se publica en la comunidad de WhatsApp (6,000+ miembros en 6 grupos) y en pitsneakers.com",
    "Sale con el sello de *Verificado por Pitsneakers*: lo revisamos antes de entregarlo, y eso le da confianza al comprador",
    "Tienes tu panel de vendedor para ver el inventario, las ofertas y las ventas",
    "Nosotros nos encargamos del cobro y del envío; cuando se vende, te consignamos",
  ],

  /** Qué pedirle al vendedor para publicar. */
  publishRequirements: [
    "Modelo y colorway (y el código de estilo si lo tienes)",
    "Talla y estado (nuevo o usado)",
    "Precio al que lo quieres vender",
    "Fotos claras: lateral, frente, suela, etiqueta y caja (si la tiene)",
  ],

  /** Horas que el bot se queda callado después de pasar la conversación a una persona. */
  humanHours: 12,

  /** Horario de atención humana (solo se muestra en el texto). */
  hoursText: "Lunes a sábado, de 9:00 a. m. a 7:00 p. m. (hora de Colombia)",

  /** Plantillas de Meta (WhatsApp Business → Plantillas) para escribirle primero a alguien. Deben estar APROBADAS con este nombre. */
  templates: {
    language: "es",
    compradores: "reactivacion_compradores",
    vendedores: "reactivacion_vendedores",
    /** Aviso al dueño de que su parte diario de Jarvis está listo (categoría Utilidad, sin variables). */
    jarvis: "parte_diario",
  },

  /** Textos propuestos para crear las plantillas en Meta. {{1}} es el primer nombre. */
  templateDrafts: {
    compradores:
      "Hola {{1}} 👋 Soy de Pitsneakers. Hace rato no te vemos por la comunidad y llegaron pares nuevos verificados. Entra a pitsneakers.com y mira lo que hay en tu talla. Si ya no quieres recibir mensajes, responde BAJA.",
    vendedores:
      "Hola {{1}} 👋 Soy de Pitsneakers. Tu comunidad sigue activa y hay compradores buscando pares. Publicar un par cuesta $10.000 y sale en la comunidad y en la página. Escríbenos aquí si quieres publicar. Si ya no quieres recibir mensajes, responde BAJA.",
    jarvis: "Hola 👋 Tu parte de hoy de Pitsneakers ya está listo. Responde VER para recibirlo aquí.",
  },
} as const;

export type BotConfig = typeof botConfig;
