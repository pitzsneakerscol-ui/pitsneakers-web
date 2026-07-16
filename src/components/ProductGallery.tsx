"use client";

import { useState } from "react";
import { Product } from "@/types/product";
import ProductMedia from "@/components/ProductMedia";

export default function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const count = Math.max(product.images.length, 1);

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-ink">
        <ProductMedia product={product} index={active} priority sizes="(min-width: 1024px) 50vw, 100vw" />
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
          Verificado por Pitsneakers
        </span>
      </div>

      {count > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActive(index)}
              className={`relative aspect-square overflow-hidden rounded-md bg-ink ring-2 transition ${
                active === index ? "ring-ink" : "ring-transparent"
              }`}
              aria-label={`Ver foto ${index + 1}`}
            >
              <ProductMedia product={product} index={index} sizes="12vw" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
