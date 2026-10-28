"use client";

import { useEffect, useRef, useState } from "react";
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

/** /products/NOMBRE.ext -> /products/t/NOMBRE.webp (ver scripts/miniaturas.mjs). */
function thumbOf(src: string): string | null {
  const m = /^\/products\/([^/]+)\.(?:webp|png|jpe?g)$/i.exec(src);
  return m ? `/products/t/${m[1]}.webp` : null;
}

export default function ProductMedia({
  product,
  index = 0,
  sizes,
  priority,
  thumb = false,
  eager = false,
  className = "",
}: {
  product: Pick<Product, "images" | "brand" | "name" | "category">;
  index?: number;
  sizes?: string;
  priority?: boolean;
  /** Usa la miniatura estática (para tarjetas): carga al instante, sin esperar a que se genere una versión reducida. */
  thumb?: boolean;
  /** Foto de lo que se ve al abrir la página: se pide ya y con prioridad. Las demás esperan a estar cerca de la pantalla. */
  eager?: boolean;
  className?: string;
}) {
  const src = product.images[index];
  // La foto aparece con un fundido cuando termina de cargar (y no "salta" sobre el cuadro vacío al deslizar).
  const [loaded, setLoaded] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  // En las tarjetas las fotos se piden cuando están cerca de la pantalla: así el ancho de banda va primero a lo que se ve
  // (si el navegador pidiera las 24 a la vez, todas llegarían tarde, incluidas las de la primera fila).
  const [near, setNear] = useState(!thumb || eager);
  const holder = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = holder.current;
    if (near || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "1400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  // Las fotos del catálogo ya son recortes transparentes (WebP): se muestran con sus colores reales, sin mezclar con
  // el fondo (así lo blanco se ve blanco). El efecto "multiplicar" queda solo para fotos antiguas con fondo blanco (PNG/JPG).
  const blend = src && /\.(png|jpe?g)$/i.test(src) ? "mix-blend-multiply" : "";

  const thumbSrc = thumb && src && !thumbFailed ? thumbOf(src) : null;

  if (src) {
    return (
      <>
      {!loaded && <span ref={holder} className="img-skeleton" aria-hidden="true" />}
      {near && (
      <Image
        src={thumbSrc ?? src}
        unoptimized={thumbSrc !== null}
        alt={`${product.brand} ${product.name}`}
        fill
        sizes={sizes ?? "(min-width: 1024px) 25vw, 50vw"}
        priority={priority || (thumb && eager)}
        quality={90}
        ref={(el) => {
          // Si ya cargó antes de que la página se hidratara, no hay evento onLoad: se detecta aquí.
          if (el?.complete && el.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        onError={() => (thumbSrc ? setThumbFailed(true) : setLoaded(true))}
        className={`object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${blend} ${className}`}
      />
      )}
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
