import { cardCls } from "@/components/reseller/ui";

export default function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className={`${cardCls} p-5`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 font-display text-3xl tracking-wide sm:text-4xl ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-accent" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
