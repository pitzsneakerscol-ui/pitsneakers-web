import Link from "next/link";
import { Product } from "@/types/product";
import { formatPrice } from "@/lib/format";
import ProductMedia from "@/components/ProductMedia";
import { WhatsAppButtonSmall } from "@/components/WhatsAppButton";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group relative flex h-full flex-col">
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-ink"
      >
        <ProductMedia
          product={product}
          className="transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              Nuevo
            </span>
          )}
          {product.condition === "usado" && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink">
              Usado
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <Link href={`/producto/${product.slug}`} className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-wider text-muted">
            {product.brand}
          </p>
          <h3 className="truncate text-sm font-medium text-ink">
            {product.name}
          </h3>
          <p className="truncate text-xs text-muted">
            {product.colorway || " "}
          </p>
        </Link>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <p className="text-sm font-semibold text-ink">
          {formatPrice(product.price)}
        </p>
        <WhatsAppButtonSmall product={product} />
      </div>
    </div>
  );
}
