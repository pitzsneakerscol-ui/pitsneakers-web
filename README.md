# Pitsneakers — Catálogo Web

Sitio tipo vitrina para Pitsneakers. No tiene carrito ni pagos: cada producto
lleva a WhatsApp con un mensaje pre-armado. La venta se cierra siempre por chat.

## Cómo agregar o editar productos

Todos los productos viven en un solo archivo:

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

Campos importantes:

- **`slug`**: va en la URL (`/producto/tu-slug`). Debe ser único, sin espacios ni tildes.
- **`category`**: solo `"sneakers"` o `"streetwear"` — controla en qué página aparece.
- **`condition`**: solo `"nuevo"` o `"usado"`.
- **`sizes`**: lista de tallas disponibles, como texto (`"9"`, `"9.5"`, `"M"`, `"L"`).
- **`featured`**: `true` para que aparezca en "Destacados" en el Home.
- **`isNew`**: `true` para que aparezca en "Lanzamientos".
- **`images`**: lista de rutas de fotos (ver siguiente sección). Si la dejas
  vacía (`[]`), la web muestra un cuadro de marcador de posición en vez de foto —
  así puedes cargar el producto antes de tener las fotos listas.

Guarda el archivo y ya — no hay que tocar ningún otro código.

## Cómo subir fotos de producto

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
  (ej: `573001234567`). **Hoy tiene un número de ejemplo — cámbialo antes de publicar.**
- `whatsappCommunityUrl`: el link de tu grupo/comunidad de WhatsApp.
- `instagramHandle` / `instagramUrl`: tu usuario de Instagram.
- `stats`: los números de la comunidad que se muestran en el Home y Footer.
- `commission`: el porcentaje y mínimo de comisión, usado en la página de Verificación.

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

Cada vez que edites `products.json` o subas fotos nuevas y hagas push a
GitHub, Vercel vuelve a publicar el sitio automáticamente.

## Estructura del sitio

- `/` — Home (hero, destacados, cómo verificamos, categorías, encargos VIP, reseñas, sobre nosotros, comunidad)
- `/sneakers` — catálogo de sneakers con filtros
- `/streetwear` — catálogo de streetwear con filtros
- `/lanzamientos` — productos marcados como `isNew`
- `/encargos` — servicio de encargos VIP (pares por pedido)
- `/verificacion` — proceso de verificación y confianza
- `/contacto` — canales de contacto (WhatsApp, Instagram)
- `/producto/[slug]` — página de cada producto
