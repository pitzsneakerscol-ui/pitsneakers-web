# Pitsneakers — Catálogo Web

Sitio tipo vitrina para Pitsneakers. No tiene carrito ni pagos: cada producto
lleva a WhatsApp con un mensaje pre-armado. La venta se cierra siempre por chat.

## Cómo agregar o editar productos (stock)

Hay dos formas de manejar el inventario. Recomendamos la primera — no requiere
tocar código, editar archivos ni hacer commits.

### Opción A — Google Sheets (recomendada)

1. Crea un Google Sheet nuevo (sheets.new) e impórtale la plantilla incluida
   en este proyecto — [`docs/plantilla-productos.csv`](docs/plantilla-productos.csv)
   (Archivo → Importar → Subir → selecciona el archivo → "Reemplazar hoja
   actual"). Trae los encabezados correctos y una fila de ejemplo. O, si
   prefieres armarlo a mano, usa estas columnas en ese orden, en la primera fila:

   ```
   NOMBRE | MARCA | SKU | CATEGORIA | PRECIO | TALLAS | CONDICION | DESCRIPCION | FOTOS | DESTACADO | LANZAMIENTO
   ```

2. Agrega un producto por fila, debajo de los encabezados. Guía de cada columna:

   | Columna | Qué va ahí | Ejemplo |
   |---|---|---|
   | NOMBRE | Nombre del modelo | `Air Max 97` |
   | MARCA | Marca | `Nike` |
   | SKU | Tu código interno de referencia (el que ya usas para identificar cada par) | `NK-AM97-001` |
   | CATEGORIA | `sneakers` o `streetwear` | `sneakers` |
   | PRECIO | Solo números | `690000` o `690.000` |
   | TALLAS | Separadas por coma | `8, 9, 9.5, 10` |
   | CONDICION | `nuevo` o `usado` | `nuevo` |
   | DESCRIPCION | Uno o dos renglones | `Cuero premium, nuevo en caja.` |
   | FOTOS | Links de las fotos, separados por coma. Sube las fotos a [postimages.org](https://postimages.org) (gratis, sin cuenta) y pega el link "directo" que te da. | `https://i.postimg.cc/abc123/1.jpg` |
   | DESTACADO | `SI` para que aparezca en "Destacados" del Home, si no `NO` o vacío | `SI` |
   | LANZAMIENTO | `SI` para que aparezca en "Lanzamientos", si no `NO` o vacío | `SI` |

   Opcionales, si algún día los quieres agregar (no rompen nada si no están):
   `COLORWAY` (ej. `Silver Bullet`) y `SUBCATEGORIA` (ej. `Lifestyle`).

   - Para **quitar** un producto del catálogo, borra su fila (o córtala y pégala en otra hoja como archivo).
   - Los productos nuevos se agregan **al final** — mientras más abajo esté la fila, más reciente se muestra en la web.

3. En Google Sheets: **Archivo → Compartir → Publicar en la Web**. Elige la
   hoja correcta y el formato **"Valores separados por comas (.csv)"**, dale
   "Publicar" y copia el link que te da.
4. Pega ese link en [`src/config/site.ts`](src/config/site.ts), en el campo
   `productsSheetUrl`. Esto lo hago yo la primera vez — solo pásame el link.

Después de esto, cualquier cambio que hagas en la hoja (agregar, editar, borrar
filas) se refleja solo en la web en 1-2 minutos, sin que nadie tenga que tocar
código ni hacer `git push`.

### Opción B — editar el archivo JSON directamente

Si prefieres no usar Sheets (o mientras configuras el link), el catálogo sigue
funcionando con el archivo local:

**[`src/data/products.json`](src/data/products.json)**

Es una lista de objetos. Para agregar un producto nuevo, copia uno existente
y cambia los valores. Ejemplo:

```json
{
  "id": "13",
  "slug": "nike-air-max-97-silver-bullet",
  "name": "Air Max 97",
  "brand": "Nike",
  "colorway": "Silver Bullet",
  "category": "sneakers",
  "subcategory": "Lifestyle",
  "price": 690000,
  "sizes": ["8", "9", "9.5", "10"],
  "condition": "nuevo",
  "description": "Descripción corta del modelo, uno o dos renglones.",
  "images": ["/products/air-max-97-silver-bullet/1.jpg"],
  "featured": false,
  "isNew": true,
  "dateAdded": "2026-07-14"
}
```

**Nota:** este archivo solo se usa cuando `productsSheetUrl` está vacío en
`src/config/site.ts`. Si ya conectaste el Sheet, editar este archivo no tiene
efecto en la web publicada.

## Cómo subir fotos de producto

- **Con Google Sheets**: sube la foto a [postimages.org](https://postimages.org)
  (o cualquier servicio que te dé un link directo a la imagen) y pega ese link
  en la columna "Fotos" de la fila del producto.
- **Con el JSON local**:
  1. Crea una carpeta dentro de `public/products/` con el nombre del producto,
     por ejemplo `public/products/air-max-97-silver-bullet/`.
  2. Copia ahí las fotos (2 a 4 imágenes, formato `.jpg` o `.webp`, funciona
     mejor si son cuadradas).
  3. En el producto dentro de `products.json`, referencia esas rutas en `images`:
     ```json
     "images": [
       "/products/air-max-97-silver-bullet/1.jpg",
       "/products/air-max-97-silver-bullet/2.jpg"
     ]
     ```

En ambos casos, si dejas las fotos vacías la web muestra un cuadro de
marcador de posición ("Foto próximamente") en vez de romperse.

### Plantilla de foto recomendada

Para que todas las fotos se vean parejas en el catálogo:

- Formato cuadrado (1:1) — súbelas ya recortadas cuadradas si puedes.
- Mismo fondo (blanco o gris claro) y misma luz para todas.
- El producto centrado y ocupando la mayoría del cuadro.
- 2 a 4 fotos por producto: de frente, de lado, suela/etiqueta, y detalle si aplica.

## Cómo agregar reseñas de clientes

Las reseñas que se muestran en el Home y en Verificación viven en:

**[`src/data/testimonials.json`](src/data/testimonials.json)**

Es una lista simple, igual que los productos. Ejemplo:

```json
{
  "id": "5",
  "name": "Camilo R.",
  "rating": 5,
  "text": "Comentario del cliente, corto y directo.",
  "product": "Air Jordan 1 Retro High OG",
  "date": "2026-07-10"
}
```

- **`rating`**: número del 1 al 5 (estrellas).
- **`product`**: opcional — qué producto compró o vendió. Si no aplica, quítalo.
- Hoy el archivo tiene reseñas de ejemplo — reemplázalas por las de tus clientes reales antes de publicar.

## Cómo poner la foto de "Sobre nosotros"

En el Home, la sección "Más que una tienda, una comunidad" tiene por ahora un
cuadro de marcador de posición en vez de foto. Cuando tengas la imagen lista
(equipo, punto de verificación, comunidad, etc.):

1. Guarda la foto en `public/`, por ejemplo `public/nosotros.jpg`.
2. En [`src/components/AboutSection.tsx`](src/components/AboutSection.tsx),
   reemplaza el bloque marcado con el comentario `Reemplaza este bloque...`
   por un `<Image src="/nosotros.jpg" alt="..." fill className="object-cover" />`
   dentro del mismo contenedor (mira `ProductGallery.tsx` como ejemplo de uso
   de `next/image` con `fill`).

Si prefieres, pásame la foto y yo hago el cambio directamente.

## Cómo configurar tu número de WhatsApp y redes

Todo está centralizado en **[`src/config/site.ts`](src/config/site.ts)**:

- `whatsappNumber`: tu número real en formato internacional, sin "+" ni espacios
  (ej: `573001234567`).
- `whatsappCommunityUrl`: el link de tu grupo/comunidad de WhatsApp.
- `instagramHandle` / `instagramUrl`: tu usuario de Instagram.
- `stats`: los números de la comunidad que se muestran en el Home y Footer.
- `commission`: el porcentaje y mínimo de comisión, usado en la página de Verificación.
- `productsSheetUrl`: el link CSV del Google Sheet de productos (ver sección
  "Cómo agregar o editar productos"). Vacío = usa el archivo JSON local.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Deploy

El proyecto está listo para desplegar en [Vercel](https://vercel.com):

1. Sube este proyecto a un repositorio de GitHub.
2. En Vercel, "New Project" → importa el repo → deploy (no necesita variables
   de entorno ni configuración extra).
3. Conecta tu dominio propio desde Vercel → Settings → Domains.

Si usas el Google Sheet para el stock, los cambios ahí se ven solos en la web,
sin pasos extra. Para cualquier otro cambio (textos, reseñas, número de
WhatsApp, `products.json`), Vercel vuelve a publicar el sitio automáticamente
cada vez que se hace push a GitHub.

## Estructura del sitio

- `/` — Home (hero, destacados, cómo verificamos, categorías, encargos VIP, reseñas, sobre nosotros, comunidad)
- `/sneakers` — catálogo de sneakers con filtros
- `/streetwear` — catálogo de streetwear con filtros
- `/lanzamientos` — productos marcados como `isNew`
- `/encargos` — servicio de encargos VIP (pares por pedido)
- `/verificacion` — proceso de verificación y confianza
- `/contacto` — canales de contacto (WhatsApp, Instagram)
- `/producto/[slug]` — página de cada producto
