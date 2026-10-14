# App móvil de Pitsneakers (Android e iOS)

Es una app hecha con [Capacitor](https://capacitorjs.com): un contenedor nativo que abre `https://pitsneakers.com` y le suma funciones propias (pantalla de carga, avisos push, compartir, vibración). **Todo lo que cambies en la página se ve en la app al instante**, sin volver a publicar en las tiendas.

- Identificador de la app: `com.pitsneakers.app` (en `capacitor.config.json`; **no se puede cambiar después de publicar**).
- Íconos y pantalla de carga ya están generados con el logo.
- Para volver a sincronizar los plugins: `cd mobile && npm install && npx cap sync`.

## Lo que necesitas (una sola vez)

| Qué | Costo | Para qué |
|---|---|---|
| **Número D-U-N-S** de Pitsneakers SAS (gratis, en dnb.com/duns) | $0, tarda días/semanas | Lo piden Apple y Google para cuentas de empresa |
| **Apple Developer Program** | US$99 al año | Publicar en App Store |
| **Google Play Console** | US$25, pago único | Publicar en Google Play |
| **Proyecto de Firebase** (gratis) | $0 | Avisos push |
| Un computador **Mac** o un servicio en la nube (Codemagic, Ionic Appflow) | Mac propio o plan gratis/pago | Compilar la app de iPhone (Apple solo permite compilar en Mac) |

## Android (se puede hacer desde Windows)

1. Instala **Android Studio** (incluye Java y el SDK).
2. Firebase: crea un proyecto → agrega una app Android con el id `com.pitsneakers.app` → descarga `google-services.json` y cópialo a `mobile/android/app/`. (Sin este archivo, la app funciona pero no recibe avisos push.)
3. En esta carpeta: `npx cap sync android` y `npx cap open android`.
4. Para probar: conecta un celular con depuración USB y pulsa ▶ en Android Studio.
5. Para publicar: **Build → Generate Signed App Bundle (AAB)**. Crea tu llave de firma (guárdala y haz copia: si la pierdes no puedes actualizar la app) y sube el `.aab` en Play Console (Producción o Prueba cerrada).
6. En Play Console completa: ficha de la tienda (descripción, capturas, ícono 512), clasificación de contenido, política de privacidad (`https://pitsneakers.com/politicas`) y el formulario de seguridad de datos.

## iPhone (necesita Mac o compilación en la nube)

1. En un Mac con **Xcode**: `cd mobile && npm install && npx cap sync ios && npx cap open ios`.
2. En Xcode → proyecto *App* → *Signing & Capabilities*: elige tu equipo de Apple Developer y agrega las capacidades **Push Notifications** y **Background Modes → Remote notifications**.
3. Avisos push en iPhone: en Firebase agrega la app iOS (`com.pitsneakers.app`), sube tu llave APNs (Apple Developer → Keys) y descarga `GoogleService-Info.plist` a `mobile/ios/App/App/`. Hay que añadir además el SDK de Firebase Messaging al proyecto (ver la guía de Capacitor "Push Notifications → iOS").
4. *Product → Archive* y sube a **App Store Connect**. Completa la ficha (capturas, descripción, clasificación por edad, política de privacidad) y envía a revisión.
5. Sin Mac: Codemagic puede compilar y subir el `.ipa` desde este mismo repositorio (necesita tus certificados de Apple).

## Para que Apple la apruebe

Apple rechaza apps que son "solo una página web". Esta app incluye funciones nativas reales: avisos push, hoja nativa de compartir, vibración en acciones (pujas, trivia), pantalla de carga y manejo de la barra de estado. En la nota para el revisor explica que la app ofrece subasta y trivia en vivo con avisos, y deja una cuenta de prueba de revendedor y un pase de prueba para la subasta y la trivia. Pagos: como son productos físicos, puedes usar Wompi (no se exige el pago de Apple/Google).

## Cómo se registran los avisos

Al abrir la app aparece un aviso para activar notificaciones; al aceptar, el celular manda su código a `POST /api/dispositivos` y queda guardado en la tabla `devices` (ligado al revendedor o al inscrito con pase, si hay sesión). **Falta construir el envío de los avisos** (trivia del jueves, subasta, ofertas): se hace con Firebase Cloud Messaging una vez exista el proyecto de Firebase.

## Navegación dentro de la app

`capacitor.config.json → server.allowNavigation` lista los dominios que se abren dentro de la app (pitsneakers.com y Wompi). Los demás enlaces (WhatsApp, Instagram) se abren en la app correspondiente. Si en las pruebas un banco de PSE se abre afuera de la app, agrega su dominio a esa lista.
