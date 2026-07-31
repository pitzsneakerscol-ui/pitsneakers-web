"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import ProductMedia from "@/components/ProductMedia";
import { WhatsAppButtonSmall } from "@/components/WhatsAppButton";

interface SearchResult {
  slug: string;
  name: string;
  brand: string;
  colorway: string | null;
  category: "sneakers" | "streetwear";
  price: number;
  multiVariant: boolean;
  condition: "nuevo" | "usado";
  sizes: string[];
  image: string | null;
}

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(DIACRITICS_REGEX, "");
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export default function FloatingSearchButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loading = open && products === null;

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || products !== null) return;
    let cancelled = false;

    fetch("/api/search-products")
      .then((res) => res.json())
      .then((data: SearchResult[]) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, products]);

  const results = useMemo(() => {
    if (!products) return [];
    const q = normalize(query.trim());
    if (!q) return [];
    return products
      .filter((p) =>
        normalize(`${p.brand} ${p.name} ${p.colorway ?? ""}`).includes(q)
      )
      .slice(0, 24);
  }, [products, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar tu par"
        className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-ink/90"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Buscar mi par</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-paper">
          <div className="flex items-center gap-3 border-b border-line px-4 py-4 sm:px-6">
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca tu par: Jordan 4, Dunk, Yeezy..."
              className="flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none sm:text-lg"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar búsqueda"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {loading && (
              <p className="text-center text-sm text-muted">Cargando catálogo…</p>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <p className="text-center text-sm text-muted">
                No encontramos nada con &ldquo;{query}&rdquo;. Prueba con otro
                nombre o marca.
              </p>
            )}

            {!loading && !query.trim() && (
              <p className="text-center text-sm text-muted">
                Escribe el nombre, la marca o el modelo que buscas.
              </p>
            )}

            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((product) => (
                <div key={product.slug} className="flex flex-col">
                  <Link
                    href={`/producto/${product.slug}`}
                    onClick={() => setOpen(false)}
                    className="relative block aspect-square w-full overflow-hidden rounded-md bg-ink"
                  >
                    <ProductMedia
                      product={{
                        images: product.image ? [product.image] : [],
                        brand: product.brand,
                        name: product.name,
                        category: product.category,
                      }}
                      sizes="25vw"
                    />
                  </Link>
                  <Link
                    href={`/producto/${product.slug}`}
                    onClick={() => setOpen(false)}
                    className="mt-2 min-w-0"
                  >
                    <p className="truncate text-[11px] uppercase tracking-wider text-muted">
                      {product.brand}
                    </p>
                    <h3 className="truncate text-sm font-medium text-ink">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {product.multiVariant
                        ? `Desde ${formatPrice(product.price)}`
                        : formatPrice(product.price)}
                    </p>
                    <WhatsAppButtonSmall
                      product={{
                        id: product.slug,
                        slug: product.slug,
                        name: product.name,
                        brand: product.brand,
                        colorway: product.colorway ?? undefined,
                        category: product.category,
                        price: product.price,
                        sizes: product.sizes,
                        condition: product.condition,
                        description: "",
                        images: product.image ? [product.image] : [],
                        dateAdded: "",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
