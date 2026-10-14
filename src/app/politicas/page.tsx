import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { weeklyTrivia } from "@/config/trivia";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Políticas",
  description: "Términos de compra, pagos, envíos, cambios y devoluciones, tratamiento de datos personales y reglas de la subasta y la trivia de Pitsneakers.",
};

const UPDATED = "14 de octubre de 2026";
const cop = (n: number) => `$${n.toLocaleString("es-CO")} COP`;

interface Section {
  id: string;
  title: string;
  body: React.ReactNode;
}

const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 leading-relaxed text-muted">{children}</p>;
const UL = ({ children }: { children: React.ReactNode }) => <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted marker:text-accent">{children}</ul>;
const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>;

const sections: Section[] = [
  {
    id: "compras",
    title: "Compras en Pitsneakers",
    body: (
      <>
        <P>
          {siteConfig.name} ({siteConfig.legalName}, NIT {siteConfig.nit}) es una comunidad de reventa de sneakers y streetwear en {siteConfig.city}. Los productos que ves en el catálogo se venden bajo el modelo de <B>consignación</B>: pertenecen a vendedores externos y Pitsneakers los verifica, los publica e intermedia la venta y la entrega.
        </P>
        <UL>
          <li>Los precios están en pesos colombianos (COP) e incluyen la comisión de Pitsneakers. No hay cargos ocultos: los únicos valores adicionales posibles son el envío y, si pagas en línea, el costo de procesamiento del pago, y ambos se te informan antes de pagar.</li>
          <li>Las fotos corresponden al modelo. Cada publicación indica la talla, el estado (nuevo o usado) y los detalles relevantes en la descripción.</li>
          <li>La disponibilidad de cada par se confirma por nuestro equipo. Como cada par es único o de pocas unidades, puede venderse por otro canal en el mismo momento: si esto ocurre después de tu pago, te devolvemos el 100% del dinero.</li>
          <li>Puedes comprar por WhatsApp o pagando en línea desde la página del par, cuando esté habilitado el botón <B>Comprar ahora</B>.</li>
        </UL>
      </>
    ),
  },
  {
    id: "pagos",
    title: "Pagos",
    body: (
      <>
        <P>
          Los pagos en línea se procesan a través de <B>Wompi</B> (Bancolombia) con PSE, Nequi o tarjeta débito y crédito. Pitsneakers <B>no recibe ni almacena</B> los datos de tu tarjeta ni de tu cuenta bancaria: se ingresan directamente en Wompi.
        </P>
        <UL>
          <li>Los pagos en línea incluyen un <B>costo de procesamiento</B> (lo que cobra la pasarela por PSE, Nequi o tarjeta). Se muestra con su valor exacto antes de pagar, dentro del total. Si prefieres no pagarlo, puedes acordar otro medio de pago por WhatsApp.</li>
          <li>Tu pedido queda confirmado cuando Wompi aprueba el pago. Te llega un comprobante al correo con la referencia del pedido (formato PITS-XXXXXXX).</li>
          <li>Si tu pago es rechazado o queda pendiente no se hace ningún cobro hasta que el banco lo apruebe.</li>
          <li>También puedes acordar otros medios de pago por WhatsApp directamente con nuestro equipo.</li>
          <li>Si necesitas un reembolso, se hace por el mismo medio con el que pagaste. El tiempo de acreditación depende de tu banco.</li>
        </UL>
      </>
    ),
  },
  {
    id: "envios",
    title: "Envíos y entregas",
    body: (
      <>
        <UL>
          <li>Después de pagar, un asesor te escribe por WhatsApp para confirmar tu dirección, el valor del envío y el tiempo estimado de entrega.</li>
          <li>El costo del envío lo asume el comprador y se informa antes de despachar. Si estás en {siteConfig.city}, podemos coordinar entrega directa.</li>
          <li>Despachamos con transportadoras aliadas y te compartimos la guía de seguimiento.</li>
          <li>Verifica el empaque al recibir. Si llega dañado, no lo recibas o avísanos de inmediato por WhatsApp con fotos o video.</li>
        </UL>
      </>
    ),
  },
  {
    id: "cambios",
    title: "Cambios, devoluciones y derecho de retracto",
    body: (
      <>
        <P>
          Para compras a distancia (por internet o por WhatsApp) aplica el <B>derecho de retracto</B> del Estatuto del Consumidor (Ley 1480 de 2011): puedes devolver el producto dentro de los <B>5 días hábiles</B> siguientes a su entrega y recibir el reembolso del dinero.
        </P>
        <UL>
          <li>El producto debe estar <B>sin uso</B>, en las mismas condiciones en que lo recibiste, con su caja original y accesorios.</li>
          <li>El costo del transporte de la devolución lo asume el comprador.</li>
          <li>Para solicitarlo, escríbenos a <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> o por WhatsApp con tu número de pedido.</li>
          <li>Hacemos el reembolso dentro de los 30 días calendario siguientes a recibir el producto devuelto.</li>
          <li><B>Garantía legal:</B> si el producto llega con un defecto que no se informó en la publicación, aplica la garantía legal. Escríbenos y lo gestionamos.</li>
          <li>Los pares usados se venden en el estado descrito en la publicación; el desgaste normal descrito no es un defecto.</li>
        </UL>
      </>
    ),
  },
  {
    id: "autenticidad",
    title: "Autenticidad y verificación",
    body: (
      <>
        <P>
          Cada par y prenda pasa por <B>revisión física y autenticación</B> antes de publicarse (costuras, materiales, etiquetas, empaque y referencias de fábrica). Solo lo que supera el proceso lleva el sello “Verificado por Pitsneakers”. Conoce el proceso completo en <Link href="/verificacion" className="font-semibold text-ink underline underline-offset-4">Verificación</Link>.
        </P>
        <P>Si llegara a comprobarse que un producto vendido por Pitsneakers no es original, te devolvemos el 100% de lo pagado.</P>
      </>
    ),
  },
  {
    id: "cuentas",
    title: "Cuentas, ofertas y colección",
    body: (
      <>
        <UL>
          <li>Puedes crear una cuenta con tu correo y contraseña o con Google. Con ella guardas tu lista de deseos, ves los pares que has comprado en Pitsneakers y haces ofertas.</li>
          <li>Para hacer ofertas y ver tus compras anteriores debes <B>confirmar tu correo</B>. Eres responsable de mantener tu contraseña en reserva.</li>
          <li>Una <B>oferta</B> es una propuesta de precio por un par publicado: no obliga a Pitsneakers a vender. Si la aceptamos, tienes <B>{siteConfig.offers.payHours} horas</B> para pagarla en línea; vencido ese plazo, el par puede venderse a otra persona. Una oferta aceptada y pagada es una compra y se rige por las reglas de compras y devoluciones.</li>
          <li>El <B>valor aproximado de tu colección</B> es solo una estimación basada en el precio al que Pitsneakers vende hoy ese modelo o en su última venta. No es una tasación ni una oferta de recompra.</li>
          <li>Puedes pedir que eliminemos tu cuenta escribiéndonos al correo de contacto.</li>
        </UL>
      </>
    ),
  },
  {
    id: "vendedores",
    title: "Vendedores y consignación",
    body: (
      <>
        <UL>
          <li>El vendedor entrega el producto a Pitsneakers, que lo revisa, lo publica y negocia la venta con el comprador.</li>
          <li>La comisión por intermediar la venta es del <B>{siteConfig.commission.percent}%</B> del valor de venta, con un mínimo de <B>{cop(siteConfig.commission.minimum)}</B> por par.</li>
          <li>El vendedor recibe el valor de la venta menos la comisión <B>una vez confirmada la entrega</B> al comprador.</li>
          <li>El vendedor garantiza que el producto es original y que tiene derecho a venderlo. Si se detecta un producto falso o información engañosa, no se publica o se retira, y la cuenta puede suspenderse.</li>
          <li>Los revendedores que usan el panel son responsables de mantener su contraseña en reserva y de la veracidad de los datos que registran.</li>
        </UL>
      </>
    ),
  },
  {
    id: "datos",
    title: "Tratamiento de datos personales",
    body: (
      <>
        <P>
          En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios, esta es la política de tratamiento de datos personales de Pitsneakers.
        </P>
        <P><B>Responsable:</B> {siteConfig.legalName}, NIT {siteConfig.nit}, domiciliada en {siteConfig.city}. <B>Contacto para temas de datos:</B> <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.</P>
        <P><B>Datos que recolectamos</B></P>
        <UL>
          <li>Al comprar: nombre, correo, celular, ciudad y dirección de entrega.</li>
          <li>Al inscribirte en la lista de espera, la subasta o la trivia: tu correo y el pase que se te asigna.</li>
          <li>Si creas una cuenta: nombre, correo, celular y ciudad, tu lista de deseos, tus ofertas y los pares que agregues a tu colección. Si entras con Google, recibimos tu nombre y correo.</li>
          <li>Si eres revendedor: usuario, nombre, correo, WhatsApp y la información de tu inventario y ventas.</li>
        </UL>
        <P><B>Para qué los usamos</B></P>
        <UL>
          <li>Procesar y entregar tus pedidos, enviarte el comprobante y atender tu servicio posventa.</li>
          <li>Avisarte de la subasta, la trivia, lanzamientos y novedades (puedes pedir que dejemos de escribirte en cualquier momento).</li>
          <li>Administrar las cuentas de revendedores y las ventas que intermediamos.</li>
          <li>Cumplir obligaciones legales y prevenir fraudes.</li>
        </UL>
        <P><B>Con quién los compartimos.</B> Solo con proveedores que nos ayudan a operar: Wompi (pagos), Google (ingreso con Google, si lo usas), Resend (envío de correos), Vercel y Turso (alojamiento y bases de datos), transportadoras (para entregar tu pedido) y WhatsApp (comunicación). Estos proveedores pueden almacenar datos en servidores fuera de Colombia. No vendemos tus datos.</P>
        <P><B>Tus derechos como titular</B></P>
        <UL>
          <li>Conocer, actualizar y rectificar tus datos.</li>
          <li>Solicitar prueba de la autorización y ser informado sobre el uso que les damos.</li>
          <li>Revocar la autorización y pedir que eliminemos tus datos cuando no exista un deber legal de conservarlos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
        </UL>
        <P>
          Para ejercer estos derechos escríbenos a <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>. Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles (plazos que la ley permite prorrogar una vez).
        </P>
        <P>
          <B>Autorización.</B> Al inscribirte, comprar o crear una cuenta, autorizas el tratamiento de tus datos para las finalidades anteriores. No pedimos datos de menores de edad; si eres menor, usa el sitio con un adulto responsable.
        </P>
        <P>
          <B>Cookies.</B> Usamos cookies necesarias para mantener tu sesión (revendedores y jugadores con pase) y guardamos en tu navegador tu preferencia de modo noche. No usamos cookies de publicidad.
        </P>
      </>
    ),
  },
  {
    id: "juegos",
    title: "Subasta, trivia y créditos",
    body: (
      <>
        <P><B>Quién participa.</B> La subasta y la trivia son para inscritos de la lista de espera con su <B>pase personal</B>. El pase es intransferible: no lo compartas.</P>
        <P><B>Subasta</B></P>
        <UL>
          <li>Pujar es un <B>compromiso de compra</B>: quien tenga la puja más alta al cierre debe pagar el par.</li>
          <li>Cada puja debe superar la anterior por el incremento indicado en cada par.</li>
          <li>Si alguien puja en los últimos 2 minutos, ese par se extiende 2 minutos más.</li>
          <li>El ganador coordina el pago por WhatsApp y tiene 24 horas para pagar; pasado ese tiempo, el par puede ofrecerse a otra persona.</li>
        </UL>
        <P><B>Trivia en vivo</B></P>
        <UL>
          <li>Se juega los jueves a las {weeklyTrivia.hour}:{String(weeklyTrivia.minute).padStart(2, "0")} a. m. (hora de Colombia), con {weeklyTrivia.questions} preguntas de {weeklyTrivia.seconds} segundos.</li>
          <li>Gana quien acierte al menos {weeklyTrivia.minCorrect} preguntas y esté entre los {weeklyTrivia.maxWinners} mejores; en caso de empate gana quien respondió más rápido en total.</li>
          <li>El premio es un crédito de <B>{cop(weeklyTrivia.prize)}</B> para comprar en Pitsneakers.</li>
          <li>Está prohibido usar varias cuentas, programas automáticos o cualquier trampa. Pitsneakers puede anular resultados y créditos obtenidos de esa forma.</li>
        </UL>
        <P><B>Créditos</B></P>
        <UL>
          <li>El crédito es un código personal que se usa con el mismo correo con el que jugaste, escribiéndolo en <B>Comprar ahora</B>.</li>
          <li>Se aplica a una sola compra, no se canjea por dinero y no se puede transferir.</li>
          <li>Si el pedido con crédito se devuelve, el crédito no se reembolsa en efectivo.</li>
        </UL>
      </>
    ),
  },
  {
    id: "contacto",
    title: "Contacto y cambios a estas políticas",
    body: (
      <>
        <P>
          Escríbenos a <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> o por{" "}
          <a className="font-semibold text-ink underline underline-offset-4" target="_blank" rel="noreferrer" href={buildGeneralWhatsAppLink("Hola! Tengo una pregunta sobre las políticas de Pitsneakers")}>WhatsApp</a>.
        </P>
        <P>Podemos actualizar estas políticas para reflejar cambios en el servicio o en la ley. La versión vigente es la que aparece en esta página, con su fecha de actualización. Las compras se rigen por la versión vigente al momento de pagar.</P>
      </>
    ),
  },
];

export default function PoliticasPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Transparencia</p>
        <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-6xl">
          Políticas de <span className="text-accent">Pitsneakers</span>
        </h1>
        <p className="mt-4 text-muted">Cómo compras, pagas, recibes y cuidamos tus datos. Última actualización: {UPDATED}.</p>
        <p className="mt-1 text-sm text-muted">{siteConfig.legalName} · NIT {siteConfig.nit} · {siteConfig.city}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-14">
        <nav aria-label="Contenido" className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">En esta página</p>
          <ol className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-block rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink lg:rounded-md lg:border-0 lg:px-0 lg:py-1 lg:text-sm lg:font-medium lg:text-muted lg:hover:text-ink">
                  <span className="text-accent">{i + 1}.</span> {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-12">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl tracking-wide sm:text-3xl">
                <span className="text-accent">{i + 1}.</span> {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
