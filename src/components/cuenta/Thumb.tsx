import ProductMedia from "@/components/ProductMedia";

/** Miniatura cuadrada de un par (foto del catálogo o iniciales si no hay foto). */
export default function Thumb({ image, brand, name, className = "h-20 w-20" }: { image: string; brand: string; name: string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-paper ${className}`}>
      <ProductMedia product={{ images: image ? [image] : [], brand, name, category: "sneakers" }} sizes="96px" />
    </div>
  );
}
