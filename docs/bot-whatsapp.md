# Bot de WhatsApp de Pitsneakers

Contesta solo a los clientes por la **API oficial de Meta (WhatsApp Cloud API)**. Panel: `/admin/whatsapp`.

## Qué hace
- **Comprar:** el cliente escribe un modelo y talla ("dunk low bacon talla 7") y el bot responde si lo tenemos, desde qué precio y con el enlace de la página.
- **Vender / publicar en la comunidad:** revisa si el par ya está en la página. Si no, explica que publicar cuesta **$10.000**, los beneficios y qué hay que mandar, y si el cliente dice que sí le avisa a una persona (por correo y en el panel).
- **Pedidos:** con el número `PITS-XXXXXXX` (o por el celular con el que compró) dice en qué paso va y da el enlace de seguimiento.
- **Envíos, pagos, verificación, cambios, horario:** respuestas fijas con los datos de la página.
- **Persona:** si el cliente escribe "asesor", pregunta por comisión, manda fotos al publicar, o el bot no lo entiende 3 veces, el bot **se calla 12 h** y la conversación aparece marcada "Atender" en el panel. Desde ahí se responde (texto libre dentro de las 24 h del último mensaje del cliente) y se le puede "Devolver al bot".
- **BAJA / ALTA:** quien escribe BAJA no recibe nada más (ni respuestas ni campañas) hasta que escriba ALTA.
- **Reactivación:** `/admin/whatsapp/reactivacion` escribe primero a *compradores que dejaron de comprar* y *vendedores que dejaron de publicar* con una plantilla aprobada. Vista previa de a cuántos llega, tandas de máximo 100, sin repetir, sin los que pidieron BAJA y se frena si fallan 3 seguidos.

## Textos y reglas
Todo lo que dice el bot (precio de publicar, beneficios, requisitos, horario, nombres y borradores de plantillas) está en `src/config/whatsapp-bot.ts`. **Revisa los beneficios antes de activar**: son un borrador armado con lo que ya dice la página.

## Activarlo (lo que falta hacer en Meta y Vercel)
1. En https://developers.facebook.com crea una app tipo **Empresa** y agrega el producto **WhatsApp**.
2. Registra el número en *WhatsApp → API Setup* (**no puede estar activo en la app normal de WhatsApp**; si es el número de la comunidad hay que migrarlo o usar otro; con la función de "coexistencia" de WhatsApp Business se puede mantener la app también).
3. Crea un **usuario del sistema** en Meta Business y genera un **token permanente** con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
4. En Vercel → Settings → Environment Variables agrega (Production) y vuelve a desplegar:
   - `WHATSAPP_TOKEN` — el token permanente
   - `WHATSAPP_PHONE_ID` — "Identificador del número de teléfono"
   - `WHATSAPP_VERIFY_TOKEN` — una frase que tú inventas
   - `WHATSAPP_APP_SECRET` — Configuración de la app → Básica → Clave secreta
5. En Meta → WhatsApp → Configuración → **Webhook**: URL `https://pitsneakers.com/api/whatsapp`, token de verificación = `WHATSAPP_VERIFY_TOKEN`, y suscríbete al campo **messages**.
6. Para la reactivación crea en *WhatsApp Manager → Plantillas* las dos plantillas (categoría Marketing, español) con los nombres y textos de `src/config/whatsapp-bot.ts` y espera la aprobación.
7. Entra a `/admin/whatsapp`: las cuatro variables deben salir en ✅.

## Reglas de WhatsApp a tener presentes
- Solo se le escribe primero a alguien con una **plantilla aprobada**; el texto libre solo sirve dentro de las 24 h del último mensaje del cliente.
- Escribirle a gente que no tuvo trato con la marca o que no puede pedir la baja lleva a **bloqueo del número**. Por eso la reactivación solo usa compradores con pedido pagado y vendedores con cuenta, y cada plantilla trae la opción de responder BAJA.
- Cada conversación de marketing la cobra Meta; empieza con tandas de ~25.

## Parte diario de Jarvis por WhatsApp
Jarvis (el asistente que arma el saludo, la noticia y el guion de cada día) entrega el parte en `https://pitsneakers.com/api/jarvis` y el bot te lo manda a tu WhatsApp personal.

- **Para pedirlo cuando quieras:** escríbele al número del bot `ver`, `parte` o `resumen de hoy`. Solo funciona desde tu número.
- **Para que llegue solo cada mañana:** WhatsApp solo deja mandar texto libre si le escribiste al bot en las últimas 24 horas. Si no, el bot te manda la plantilla `parte_diario` ("Tu parte de hoy ya está listo. Responde VER…") y al responder te llega completo.

### Activarlo
1. En Vercel → Settings → Environment Variables agrega (Production) y vuelve a desplegar:
   - `JARVIS_TOKEN` — una clave larga que tú inventas (mínimo 24 caracteres)
   - `JARVIS_WHATSAPP_TO` — tu WhatsApp personal con código de país y solo dígitos (ej. `573001234567`). **No puede ser el número del bot.**
2. En Claude, guarda esa misma clave como credencial del sitio `pitsneakers.com` (Jarvis te muestra el formulario).
3. En *WhatsApp Manager → Plantillas* crea la plantilla `parte_diario` (categoría **Utilidad**, español, sin variables) con el texto de `src/config/whatsapp-bot.ts` y espera la aprobación.
4. Escríbele `ver` al bot desde tu número para probar.
