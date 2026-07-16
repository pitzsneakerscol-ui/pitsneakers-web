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

  if (src) {
    const isExternal = /^https?:\/\//.test(src);
    return (
      <Image
        src={src}
        alt={`${product.brand} ${product.name}`}
        fill
        sizes={sizes ?? "(min-width: 1024px) 25vw, 50vw"}
        priority={priority}
        unoptimized={isExternal}
        className={`object-cover ${className}`}
      />
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
