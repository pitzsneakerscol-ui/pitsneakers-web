import { ProductGroup } from "@/types/product";
import { groupScarcity } from "@/lib/scarcity";

/** Aviso discreto: una línea de texto pequeña con un punto, sin fondo ni etiqueta sobre la foto. */
export default function ScarcityBadge({ group, className = "" }: { group: ProductGroup; className?: string }) {
  const s = groupScarcity(group);
  if (!s || s.level === "rare") return null;
  return (
    <p
      className={`flex items-center gap-1.5 truncate text-[11px] font-medium ${s.level === "last" ? "text-accent" : "text-muted"} ${className}`}
    >
      <span className="scarcity-dot h-1 w-1 shrink-0 rounded-full bg-current" aria-hidden="true" />
      <span className="truncate">{s.text}</span>
    </p>
  );
}
