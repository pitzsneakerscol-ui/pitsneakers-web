"use client";

import { useState } from "react";
import { Product } from "@/types/product";
import { formatPrice } from "@/lib/format";
import { WhatsAppButtonLarge } from "@/components/WhatsAppButton";

export default function ProductPurchasePanel({ product }: { product: Product }) {
  const [size, setSize] = useState<string | undefined>(undefined);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        {product.brand}
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-wide sm:text-4xl">
        {product.name}
      </h1>
      {product.colorway && (
        <p className="mt-1 text-sm text-muted">{product.colorway}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            product.condition === "nuevo"
              ? "bg-ink text-white"
              : "bg-line text-ink"
          }`}
        >
          {product.condition}
        </span>
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Talla {product.category === "sneakers" ? "" : "/ Talla"}
          {size ? ` — seleccionada: ${size}` : " — selecciona una"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize((current) => (current === s ? undefined : s))}
              className={`min-w-[3rem] rounded-md border px-3 py-2.5 text-sm font-medium transition ${
                size === s
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-paper-raised text-ink hover:border-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <WhatsAppButtonLarge product={product} size={size} />
        <p className="mt-3 text-xs text-muted">
          Te lleva directo a WhatsApp con el producto{size ? ` y la talla ${size}` : ""} ya escrito en el mensaje.
        </p>
      </div>

      <div className="mt-10 border-t border-line pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Descripción
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {product.description}
        </p>
      </div>
    </div>
  );
}
