import { ProductGroup } from "@/types/product";
import { groupScarcity } from "@/lib/scarcity";

const COLORS = {
  last: "bg-accent text-white",
  low: "bg-ink text-white",
  rare: "bg-white/90 text-ink",
} as const;

export default function ScarcityBadge({ group, className = "" }: { group: ProductGroup; className?: string }) {
  const s = groupScarcity(group);
  if (!s) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${COLORS[s.level]} ${className}`}
    >
      <span className="scarcity-dot h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {s.text}
    </span>
  );
}
