# Ficha de Google Play (es-419 / es-CO)

Textos listos para pegar en Play Console. Revísalos antes. Los límites son los de Google.

## Nombre de la app (máx. 30)
Pitsneakers

## Descripción breve (máx. 80)
Sneakers y streetwear verificados en Colombia. Subasta, trivia y ofertas.

## Descripción completa (máx. 4000)
Pitsneakers es la tienda colombiana de sneakers y streetwear verificados.

• Pares originales: cada par pasa por nuestro Pits Enigma Verification Process (autenticidad, estado, talla y empaque) antes de salir.
• Sigue tu pedido paso a paso: confirmado, en camino a verificación, verificado, despachado y entregado, con avisos en tu celular.
• Subasta en vivo: puja por pares exclusivos y recibe un aviso cuando te superan.
• Trivia en vivo: gana crédito para tu próxima compra respondiendo bien.
• Ofertas: propón tu precio por un par y te respondemos.
• Favoritos y colección: guarda lo que quieres y registra los pares que ya tienes.
• Pago seguro con Wompi (tarjetas, PSE y Nequi) y envíos a toda Colombia.
• Para revendedores: controla tu inventario, tus ventas y tu ganancia real.

## Categoría y etiquetas
- Tipo: Aplicación. Categoría: **Compras**.
- Etiquetas sugeridas: Compras, Moda, Estilo de vida.

## Datos de contacto (públicos en la ficha)
- Correo: el de `siteConfig.contactEmail` (contacto de Pitsneakers).
- Sitio web: https://pitsneakers.com
- Política de privacidad: https://pitsneakers.com/politicas

## Gráficos que pide Google
- Ícono 512×512 PNG (sin esquinas redondeadas, Google las aplica).
- Gráfico de funciones 1024×500 (JPG/PNG).
- Capturas de teléfono: mínimo 2, máximo 8 (relación 16:9 o 9:16; lado corto ≥ 320 px, largo ≤ 3840 px). Recomendado: 1080×1920.
- Tablet 7" y 10" son opcionales.

## Clasificación de contenido (cuestionario IARC)
Categoría: "Referencia, noticias o educación" no aplica; elige **Compras / Otra**. Responde **No** a violencia, sexo, lenguaje fuerte, sustancias, juegos de azar simulados o con dinero real. La subasta es de pares físicos y la trivia da crédito de tienda, no premios en efectivo: no es juego de azar. Resultado esperado: apta para todos (o 3+/PEGI 3).

## Público objetivo
Mayores de 18 años (o 13+). No marques "niños" ni "familias": evita los requisitos de la política para menores.

## Acceso a la app (App access)
La app tiene áreas con inicio de sesión. Marca "Algunas funciones están restringidas" y entrega:
- Comprador: `<correo de prueba>` / `<contraseña de prueba>` (Cuenta → Ingresar).
- Revendedor: `<usuario de prueba>` / `<contraseña de prueba>` (Cuenta → Ingresar como revendedor).
(Crea las dos cuentas antes y reemplaza lo que va entre <>.)

## Anuncios
No contiene anuncios.

## Eliminación de cuenta (obligatorio)
- Dentro de la app: Mi cuenta → Perfil → "Eliminar mi cuenta" (compradores) y Mi cuenta → "Eliminar mi cuenta" (revendedores).
- URL pública para pedir la eliminación: **https://pitsneakers.com/eliminar-cuenta**
- Se conserva solo el registro contable de pedidos pagados (obligación legal).

## Seguridad de los datos (Data safety)

**¿Recopila o comparte datos del usuario?** Sí.
**¿Cifra los datos en tránsito?** Sí (HTTPS).
**¿Puede el usuario pedir que se eliminen sus datos?** Sí → URL de arriba.
**¿Vende datos?** No.

| Tipo de dato | Recopilado | Compartido | Para qué |
|---|---|---|---|
| Nombre | Sí | Sí (transportadora, solo para entregar) | Funcionalidad de la app, gestión de cuenta |
| Correo electrónico | Sí | No | Funcionalidad, gestión de cuenta, comunicaciones |
| Teléfono | Sí | Sí (transportadora) | Funcionalidad (entrega), comunicaciones |
| Dirección física | Sí | Sí (transportadora) | Funcionalidad (entrega) |
| ID de usuario | Sí | No | Gestión de cuenta |
| ID de dispositivo u otros (token de notificaciones) | Sí | Sí (Google/Firebase para entregar el aviso) | Notificaciones, funcionalidad |
| Historial de compras | Sí | No | Funcionalidad, gestión de cuenta |
| Otro contenido del usuario (favoritos, colección, ofertas) | Sí | No | Funcionalidad |

Marca estos datos como **obligatorios** (la cuenta los necesita) salvo el token de notificaciones, que es **opcional** (el usuario puede negarse).

**No se recopilan:** ubicación, contactos, fotos o archivos del usuario, audio, salud, datos financieros (el pago ocurre en Wompi; la app no guarda tarjetas ni cuentas), historial de navegación ni identificador de publicidad.

**Nota sobre pagos:** los pagos físicos van por Wompi, una pasarela externa; no aplica Google Play Billing porque se venden bienes físicos.

## Notas para el revisor (en inglés)

Pitsneakers is a Colombian marketplace for verified sneakers and streetwear. The app wraps our storefront (https://pitsneakers.com) with native features: push notifications for order status, auctions and trivia, native share and haptic feedback.

Only physical goods are sold; payment is processed by Wompi (Colombian gateway), so Google Play Billing is not used.

Account deletion: in-app (Account → Profile → "Eliminar mi cuenta") and public web page https://pitsneakers.com/eliminar-cuenta.

Test accounts: see "App access" above. Google sign-in is hidden inside the app; sign in with email and password.

## Antes de la primera publicación
- Cuenta de **organización**: Google verifica la identidad (D-U-N-S) y puede tardar días.
- Cuenta de **persona natural**: suele exigir una prueba cerrada (unos 12 testers durante 14 días) antes de pasar a Producción. Confirmarlo en la consola.
- Activa **Play App Signing** al subir el primer `.aab` y guarda tu llave de subida en dos sitios.
