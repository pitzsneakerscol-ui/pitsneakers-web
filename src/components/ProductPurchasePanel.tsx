"use client";

import { useMemo, useState } from "react";
import { Product, ProductGroup } from "@/types/product";
import { formatPrice } from "@/lib/format";
import { groupPriceRange } from "@/lib/grouping";
import { WhatsAppButtonLarge } from "@/components/WhatsAppButton";

interface Option {
  key: string;
  size: string;
  condition: Product["condition"];
  price: number;
  variant: Product;
}

function buildOptions(group: ProductGroup): Option[] {
  const options: Option[] = [];

  group.variants.forEach((variant) => {
    if (variant.sizes.length === 0) {
      options.push({
        key: `${variant.id}-unica`,
        size: "Única",
        condition: variant.condition,
        price: variant.price,
        variant,
      });
      return;
    }
    variant.sizes.forEach((size) => {
      options.push({
        key: `${variant.id}-${size}`,
        size,
        condition: variant.condition,
        price: variant.price,
        variant,
      });
    });
  });

  return options.sort((a, b) => a.price - b.price);
}

export default function ProductPurchasePanel({ group }: { group: ProductGroup }) {
  const options = useMemo(() => buildOptions(group), [group]);
  const multiVariant = group.variants.length > 1;
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    options.length === 1 ? options[0].key : undefined
  );
  const selected = options.find((o) => o.key === selectedKey);
  const { min, max } = groupPriceRange(group);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        {group.brand}
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-wide sm:text-4xl">
        {group.name}
      </h1>
      {group.colorway && (
        <p className="mt-1 text-sm text-muted">{group.colorway}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <p className="text-2xl font-semibold">
          {selected
            ? formatPrice(selected.price)
            : multiVariant
              ? `Desde ${formatPrice(min)}`
              : formatPrice(options[0]?.price ?? min)}
        </p>
        {(!multiVariant || selected) && (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              (selected?.condition ?? options[0]?.condition) === "nuevo"
                ? "bg-ink text-white"
                : "bg-line text-ink"
            }`}
          >
            {selected?.condition ?? options[0]?.condition}
          </span>
        )}
        {multiVariant && !selected && max !== min && (
          <span className="text-sm text-muted">hasta {formatPrice(max)}</span>
        )}
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {multiVariant ? "Elige talla y estado" : "Talla"}
          {selected
            ? ` — seleccionada: Talla ${selected.size}${
                multiVariant ? ` · ${selected.condition}` : ""
              }`
            : " — selecciona una opción"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() =>
                setSelectedKey((current) => (current === o.key ? undefined : o.key))
              }
              className={`rounded-md border px-3 py-2.5 text-sm font-medium transition ${
                selectedKey === o.key
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-paper-raised text-ink hover:border-ink"
              }`}
            >
              {multiVariant ? (
                <span className="flex flex-col items-start leading-tight">
                  <span>Talla {o.size}</span>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${
                      selectedKey === o.key ? "text-white/70" : "text-muted"
                    }`}
                  >
                    {o.condition} · {formatPrice(o.price)}
                  </span>
                </span>
              ) : (
                o.size
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {!multiVariant || selected ? (
          <>
            <WhatsAppButtonLarge
              product={selected ? selected.variant : options[0].variant}
              size={selected ? selected.size : undefined}
            />
            <p className="mt-3 text-xs text-muted">
              Te lleva directo a WhatsApp con el producto
              {selected ? ` y la talla ${selected.size}` : ""} ya escrito en el
              mensaje.
            </p>
          </>
        ) : (
          <div className="rounded-full border border-dashed border-line px-8 py-4 text-center text-sm text-muted">
            Selecciona una talla y estado para continuar por WhatsApp
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-line pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Descripción
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {group.description}
        </p>
      </div>
    </div>
  );
}
