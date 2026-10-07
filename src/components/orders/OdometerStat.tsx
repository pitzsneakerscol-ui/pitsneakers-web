"use client";

import OdometerValue from "@/components/OdometerValue";
import { useInView } from "@/lib/useInView";

/** Cifra que gira como odómetro al entrar en pantalla. */
export default function OdometerStat({ value, label }: { value: string; label: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  return (
    <div ref={ref}>
      <p className="font-display text-4xl tracking-wide text-accent sm:text-5xl">
        <OdometerValue value={value} play={seen} />
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">{label}</p>
    </div>
  );
}
