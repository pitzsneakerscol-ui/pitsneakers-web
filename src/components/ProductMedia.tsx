"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/types/product";

function initials(brand: string, name: string) {
  const b = brand.trim().charAt(0);
  const n = name.trim().charAt(0);
  return `${b}${n}`.toUpperCase();
}

const GRADIENTS: Record<string, string> = {
  sneakers: "from-[#1a1a1a] via-[#2b2b2b] to-[#0a0a0a]",
  streetwear: "from-[#2a2118] via-[#1c1712] to-[#0a0a0a]",
};

export default function ProductMedia({
  product,
  index = 0,
  sizes,
  priority,
  className = "",
}: {
  product: Pick<Product, "images" | "brand" | "name" | "category">;
  index?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const src = product.images[index];
  // La foto aparece con un fundido cuando termina de cargar (y no "salta" sobre el cuadro vacío al deslizar).
  const [loaded, setLoaded] = useState(false);
  // Las fotos del catálogo ya son recortes transparentes (WebP): se muestran con sus colores reales, sin mezclar con
  // el fondo (así lo blanco se ve blanco). El efecto "multiplicar" queda solo para fotos antiguas con fondo blanco (PNG/JPG).
  const blend = src && /\.(png|jpe?g)$/i.test(src) ? "mix-blend-multiply" : "";

  if (src) {
    return (
      <>
      {!loaded && <span className="img-skeleton" aria-hidden="true" />}
      <Image
        src={src}
        alt={`${product.brand} ${product.name}`}
        fill
        sizes={sizes ?? "(min-width: 1024px) 25vw, 50vw"}
        priority={priority}
        quality={90}
        ref={(el) => {
          // Si ya cargó antes de que la página se hidratara, no hay evento onLoad: se detecta aquí.
          if (el?.complete && el.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${blend} ${className}`}
      />
      </>
    );
  }

  const gradient = GRADIENTS[product.category] ?? GRADIENTS.sneakers;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradient} ${className}`}
    >
      <span className="font-display text-white/10 leading-none select-none text-[18vw] sm:text-6xl lg:text-7xl">
        {initials(product.brand, product.name)}
      </span>
      <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.2em] text-white/40">
        Foto próximamente
      </span>
    </div>
  );
}
