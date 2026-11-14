# Plantillas de WhatsApp para avisos de pedido (retiro y envío)

Listas para crear en **WhatsApp Manager → Plantillas de mensajes** y mandar a aprobación.
Idioma `es` (el mismo que usan `reactivacion_compradores` y `parte_diario`). Categoría **Utilidad**.
Son mensajes sobre un pedido que el cliente ya pagó, así que no son marketing y no necesitan consentimiento extra.

Variables: `{{1}}` = primer nombre del comprador, `{{2}}` = referencia del pedido (PITS-XXXXXXX), `{{3}}` = producto.

---

## 1. `pedido_pago_recibido`

> Hola {{1}}, ya recibimos el pago de tu pedido {{2}} ({{3}}). Gracias por comprar en Pitsneakers.
> Tu par pasa por verificación antes de entregártelo. Te escribimos por aquí en cada paso. Puedes ver el estado en pitsneakers.com/pedido

Ejemplo para Meta: `Carlos`, `PITS-NKMHVPS`, `Jordan 1 Hyper Royal talla 7`.

## 2. `pedido_verificado`

> Hola {{1}}, tu {{3}} (pedido {{2}}) ya llegó a verificación y pasó la revisión. Ahora lo dejamos listo para entregártelo y te avisamos en cuanto puedas recibirlo.

## 3. `pedido_listo_recoger`

> Hola {{1}}, tu pedido {{2}} ({{3}}) está listo para recoger en nuestro punto de verificación en Bogotá. Escríbenos aquí para coordinar el día y la hora. Quien recoja debe llevar su cédula.

## 4. `pedido_en_camino` (envíos a domicilio)

> Hola {{1}}, tu pedido {{2}} ({{3}}) ya salió. Te mandamos la guía de seguimiento por correo. Si tienes dudas, escríbenos por aquí.

---

## Cómo se conectan al sistema (siguiente paso, cuando Meta apruebe)

- Ya existe `sendTemplate(to, name, language, params)` en `src/lib/wa-cloud.ts`.
- Los avisos de pedido salen hoy por correo desde `src/lib/order-emails.ts`; los puntos donde se enviaría el WhatsApp son los mismos:
  - pago recibido: `src/app/api/wompi/eventos/route.ts`
  - verificado / listo para recoger / en camino: `src/app/admin/pedidos/actions.ts`
- El número sale de `buyerPhone` del pedido (10 dígitos, se antepone 57).
- Conviene que un fallo de WhatsApp nunca bloquee el cambio de estado ni el correo.

## Mientras tanto (a mano)

Dentro de las 24 h desde que el cliente escribió se puede responder con texto libre. Sugerido para "listo para recoger":

> Hola Carlos, tu pedido PITS-XXXXXXX (Jordan 4 Lakers talla 12.5) ya está listo para recoger en Bogotá. ¿Qué día y hora te queda bien? Recuerda llevar la cédula de quien recoge.
