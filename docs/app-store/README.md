# Publicar Pitsneakers en la App Store

Estado: el proyecto de iPhone (`mobile/ios`) ya está preparado en el código. Lo que falta es lo que solo puedes hacer tú con tus cuentas.

## Lo que ya está hecho en el código

- Avisos push de iPhone conectados (`AppDelegate.swift` + permiso `App.entitlements`).
- Declaraciones que pide Apple: `PrivacyInfo.xcprivacy` (sin rastreo ni datos recolectados por la app) y exportación de cifrado (`ITSAppUsesNonExemptEncryption = NO`).
- **Eliminar cuenta dentro de la app** (Apple lo exige si se puede crear cuenta): compradores en *Mi cuenta → Perfil* y revendedores en *Mi cuenta*. Los pedidos pagados se conservan como registro contable.
- Dentro de la app no se muestra "Continuar con Google" (Google bloquea ese inicio de sesión en vistas web y Apple pediría además "Iniciar con Apple"). Ahí se entra con correo y contraseña.
- Compilación en la nube lista en `codemagic.yaml`.

## Lo que tienes que hacer tú (en este orden)

1. **Número D-U-N-S** de Pitsneakers SAS (gratis, dnb.com/duns; tarda días o semanas). Si te inscribes como persona natural no hace falta.
2. **Apple Developer Program** (US$99 al año) en developer.apple.com/programs.
3. En developer.apple.com → *Certificates, Identifiers & Profiles → Identifiers*: crea el identificador `com.pitsneakers.app` y marca la capacidad **Push Notifications**.
4. En **App Store Connect** → *Apps → +* → Nueva app: nombre *Pitsneakers*, idioma principal español, bundle `com.pitsneakers.app`, SKU `pitsneakers-ios`. Copia el **Apple ID** numérico de la app (sale en *Información de la app*).
5. En App Store Connect → *Usuarios y acceso → Integraciones → Claves de App Store Connect*: crea una llave con rol **App Manager** y descarga el `.p8` (solo se baja una vez).
6. **Codemagic** (codemagic.io, entra con GitHub y elige este repositorio):
   - *Teams → Integrations → App Store Connect*: agrega la llave con el nombre exacto `pitsneakers_asc` (Issuer ID, Key ID y el `.p8`).
   - *Environment variables* del flujo `ios-app-store`: `APP_STORE_APPLE_ID` = el número del paso 4.
   - Pulsa *Start new build* con el flujo `ios-app-store`. Sube la compilación a TestFlight.
7. Prueba la app desde **TestFlight** en un iPhone (instala la app *TestFlight* y acepta la invitación).
8. Avisos push de iPhone (opcional para la primera versión): en Apple Developer crea una llave APNs y súbela a Firebase; el envío de avisos aún no está construido (ver `mobile/README.md`).
9. Completa la ficha con `ficha-es.md` y envía a revisión.

## Antes de enviar a revisión

- Capturas: iPhone 6,9" (1320×2868) y 6,5" (1242×2688) como mínimo; iPad 13" (2064×2752) si la app es compatible con iPad.
- Política de privacidad: `https://pitsneakers.com/politicas`.
- Deja una **cuenta de prueba de comprador** y otra de **revendedor** en las notas para el revisor (ver `ficha-es.md`).
- Apple rechaza apps que son "solo una página web" (guía 4.2). Ayuda mucho explicar las funciones nativas: avisos push, subasta y trivia en vivo, compartir y vibración.
