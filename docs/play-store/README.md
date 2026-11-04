# Publicar Pitsneakers en Google Play

La compilación de Android se hace en la nube con Codemagic (flujo `android-play-store` de `codemagic.yaml`): no necesitas Android Studio ni Java. Textos de la ficha: `ficha-es.md`.

## En este orden

1. **Cuenta de Google Play Console** (US$25, pago único): play.google.com/console. Como organización usa el D-U-N-S de Pitsneakers SAS.
2. **Firebase** (avisos push de Android), console.firebase.google.com:
   - Crea el proyecto y agrega una app Android con el id `com.pitsneakers.app`.
   - Descarga `google-services.json`. **No lo subas al repositorio** (está ignorado a propósito).
   - *Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada*: pega ese JSON en Vercel como `FCM_SERVICE_ACCOUNT` (así el servidor envía los avisos).
3. **Codemagic** (ya lo usas para iPhone; si no, entra en codemagic.io con GitHub y elige este repositorio):
   - *Teams → Code signing identities → Android keystores → Generate keystore*. Nómbralo exactamente **`pitsneakers_upload`** (alias y contraseñas a tu gusto). **Descarga y guarda una copia** del keystore y sus contraseñas en dos sitios.
   - En la app → *Environment variables*, agrega `GOOGLE_SERVICES_JSON` (marcada como *Secure*) con `google-services.json` en base64. En PowerShell, desde la carpeta del proyecto:
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("mobile\android\app\google-services.json")) | Set-Clipboard
     ```
     Sin esta variable la app se compila igual, pero no recibe avisos.
4. **Compila:** *Start new build* → flujo **Pitsneakers Android (Google Play)**. Dura unos 10 minutos. Al terminar, descarga el `.aab` de *Artifacts*.
5. **Play Console → crear app** (*Pitsneakers*, español, app gratuita) y sube el `.aab` a **Pruebas → Prueba interna**. Acepta **Play App Signing** cuando lo pida (Google guarda la llave final; la de Codemagic queda como llave de subida).
6. Instala desde la prueba interna en tu celular y revisa: abre, inicia sesión, llega un aviso (envía uno desde el panel → *Avisos en la app*).
7. Completa la ficha con `ficha-es.md` y pasa a **Producción**.

## Detalles

- El número de versión (`versionCode`) sube solo en cada compilación de Codemagic. Si Play rechaza un número ya usado, súbelo editando `versionCode` en `mobile/android/app/build.gradle`.
- La primera subida a Play debe ser **manual**. Después puedes automatizar: en `codemagic.yaml`, quita el `#` del bloque `publishing → google_play` y agrega `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` (JSON de una cuenta de servicio con permisos en Play Console → *Usuarios y permisos*).
- Sin llave de firma (por ejemplo en Android Studio) el proyecto compila igual, pero sin firmar para publicación.
- Si cambia el contenido de la app web no hace falta recompilar: la app abre pitsneakers.com. Solo se recompila al cambiar plugins, íconos o la configuración nativa.
