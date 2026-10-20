"use client";

import { useEffect, useMemo, useState } from "react";
import { Product, ProductGroup } from "@/types/product";
import { formatPrice } from "@/lib/format";
import { groupPriceRange } from "@/lib/grouping";
import { WhatsAppButtonLarge } from "@/components/WhatsAppButton";
import ScarcityBadge from "@/components/ScarcityBadge";
import CheckoutForm from "@/components/CheckoutForm";
import OfferBox from "@/components/cuenta/OfferBox";
import { shareLink } from "@/lib/native";
import SizeHelp from "@/components/SizeHelp";

interface Option {
  key: string;
  size: string;
  condition: Product["condition"];
  price: number;
  /** Esta talla está en rebaja (precio "antes" mayor al actual). */
  sale: boolean;
  variant: Product;
}

function onSale(variant: Product): boolean {
  return Boolean(variant.promo && variant.priceBefore && variant.priceBefore > variant.price);
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
        sale: onSale(variant),
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
        sale: onSale(variant),
        variant,
      });
    });
  });

  // Si una misma talla (y estado) la venden varios, se muestra solo la opción más barata.
  const cheapest = new Map<string, Option>();
  for (const o of options) {
    const k = `${o.size}|${o.condition}`;
    const prev = cheapest.get(k);
    if (!prev || o.price < prev.price) cheapest.set(k, o);
  }
  return [...cheapest.values()].sort((a, b) => a.price - b.price || parseFloat(a.size) - parseFloat(b.size) || 0);
}

export default function ProductPurchasePanel({
  group,
  sticky = false,
  payEnabled: payEnabledProp = false,
  payTest: payTestProp = false,
}: {
  group: ProductGroup;
  /** En celular, fija el botón de WhatsApp al borde inferior (página de producto). */
  sticky?: boolean;
  /** Pago en línea (Wompi) disponible: se muestra "Comprar ahora". */
  payEnabled?: boolean;
  payTest?: boolean;
}) {
  // El estado del pago se pregunta al abrir la página: no depende de cuándo se construyó el sitio.
  const [pay, setPay] = useState({ enabled: payEnabledProp, test: payTestProp });
  useEffect(() => {
    let live = true;
    fetch("/api/pago/estado", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean; test?: boolean } | null) => {
        if (live && d) setPay({ enabled: Boolean(d.enabled), test: Boolean(d.test) });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const payEnabled = pay.enabled;
  const payTest = pay.test;
  const options = useMemo(() => buildOptions(group), [group]);
  const multiVariant = group.variants.length > 1;
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    options.length === 1 ? options[0].key : undefined
  );
  const selected = options.find((o) => o.key === selectedKey);
  const prices = options.map((o) => o.price);
  const min = prices.length ? Math.min(...prices) : groupPriceRange(group).min;
  const max = prices.length ? Math.max(...prices) : groupPriceRange(group).max;
  const activeVariant = selected ? selected.variant : !multiVariant ? options[0]?.variant : undefined;
  const activePromo =
    activeVariant?.promo && activeVariant.priceBefore && activeVariant.priceBefore > activeVariant.price
      ? activeVariant
      : undefined;

  const priceLabel = selected
    ? formatPrice(selected.price)
    : multiVariant
      ? `Desde ${formatPrice(min)}`
      : formatPrice(options[0]?.price ?? min);
  const ready = !multiVariant || Boolean(selected);

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

      <ScarcityBadge group={group} className="mt-3" />
      <button
        type="button"
        onClick={() => void shareLink({ title: `${group.brand} ${group.name}`, text: `Mira este par en Pitsneakers: ${group.brand} ${group.name}`, url: `${window.location.origin}/producto/${group.groupSlug}` })}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted transition hover:border-ink hover:text-ink"
      >
        Compartir
      </button>

      <div className="mt-4 flex items-center gap-3">
        {activePromo && (
          <p className="text-lg text-muted line-through">
            {formatPrice(activePromo.priceBefore!)}
          </p>
        )}
        <p className={`text-2xl font-semibold ${activePromo ? "text-accent" : ""}`}>
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
        <SizeHelp brand={group.brand} name={group.name} sizes={options.map((o) => o.size)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() =>
                setSelectedKey((current) => (current === o.key ? undefined : o.key))
              }
              className={`rounded-md border px-3 py-2.5 text-sm font-medium transition ${
                o.sale ? "size-sale " : ""
              }${
                selectedKey === o.key
                  ? "border-ink bg-ink text-white"
                  : o.sale
                    ? "border-accent bg-paper-raised text-ink"
                    : "border-line bg-paper-raised text-ink hover:border-ink"
              }`}
            >
              {multiVariant ? (
                <span className="flex flex-col items-start leading-tight">
                  <span className="flex items-center gap-1.5">
                    Talla {o.size}
                    {o.sale && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                        Sale
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${
                      selectedKey === o.key ? "text-white/70" : o.sale ? "font-semibold text-accent" : "text-muted"
                    }`}
                  >
                    {o.condition} · {formatPrice(o.price)}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  {o.size}
                  {o.sale && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                      Sale
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-8 ${sticky && !payEnabled ? "hidden lg:block" : ""}`}>
        {!multiVariant || selected ? (
          <>
            {payEnabled && (
              <div className="mb-3">
                <CheckoutForm
                  key={selected?.key ?? "unico"}
                  productId={(selected ? selected.variant : options[0].variant).id}
                  size={selected ? selected.size : options[0].size}
                  name={`${group.brand} ${group.name}`}
                  price={selected ? selected.price : options[0].price}
                  test={payTest}
                />
              </div>
            )}
            <div className="mb-3">
              <OfferBox
                key={`of-${selected?.key ?? "unico"}`}
                productId={(selected ? selected.variant : options[0].variant).id}
                size={selected ? selected.size : options[0].size}
                name={`${group.brand} ${group.name}`}
                price={selected ? selected.price : options[0].price}
                slug={group.groupSlug}
              />
            </div>
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

      {sticky && (
        <div
          className="fixed inset-x-0 z-40 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 shrink-0 leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {selected ? `Talla ${selected.size}` : "Precio"}
              </p>
              <p className={`text-lg font-semibold ${activePromo ? "text-accent" : ""}`}>{priceLabel}</p>
            </div>
            {ready ? (
              <WhatsAppButtonLarge
                product={selected ? selected.variant : options[0].variant}
                size={selected ? selected.size : undefined}
                className="!px-4 !py-3 !text-sm"
              />
            ) : (
              <div className="flex-1 rounded-full border border-dashed border-ink/30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                Elige talla para continuar
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
