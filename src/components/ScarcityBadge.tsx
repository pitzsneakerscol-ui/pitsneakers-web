import { ProductGroup } from "@/types/product";
import { groupScarcity } from "@/lib/scarcity";

/** Aviso discreto: una línea de texto pequeña con una llama y el texto animados (la línea completa respira y el texto brilla en tonos de fuego), sin fondo ni etiqueta. */
export default function ScarcityBadge({ group, className = "" }: { group: ProductGroup; className?: string }) {
  const s = groupScarcity(group);
  if (!s || s.level === "rare") return null;
  return (
    <p
      className={`scarcity-line flex w-fit items-center gap-1.5 text-xs font-semibold ${className}`}
    >
      <svg className="scarcity-flame h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2c.6 3.2 2.2 4.9 3.9 6.7C17.6 10.5 19 12.4 19 15a7 7 0 0 1-14 0c0-2.1.9-3.8 2.2-5.1.2 1.2.8 2.1 1.8 2.6C8.6 8.3 9.8 4.6 12 2z"
          fill="#ff5a1f"
        />
        <path
          d="M12 22a4.2 4.2 0 0 1-4.2-4.2c0-1.9 1.2-3 2.3-4.2.5.9 1.1 1.4 1.9 1.7.1-1.4.8-2.6 1.7-3.5.9 1.2 2.5 2.6 2.5 4.6A4.2 4.2 0 0 1 12 22z"
          fill="#ffc83d"
        />
      </svg>
      <span className="scarcity-text">{s.text}</span>
    </p>
  );
}
