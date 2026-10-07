"use client";

import { useEffect, useRef, useState } from "react";

/** Número que "corre" suavemente hasta su nuevo valor cada vez que cambia. */
export default function AnimatedNumber({
  value,
  format,
  duration = 800,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    const delta = value - start;
    if (delta === 0) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = calm ? 1 : Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + delta * eased;
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="tabular-nums">{format(Math.round(shown))}</span>;
}
