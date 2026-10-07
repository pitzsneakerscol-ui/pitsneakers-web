"use client";

import { useEffect, useState } from "react";

/** Frase que cambia sola cada pocos segundos, entrando desde abajo. */
export default function Rotator({ phrases, every = 2800 }: { phrases: string[]; every?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (phrases.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % phrases.length), every);
    return () => clearInterval(id);
  }, [phrases.length, every]);

  return (
    <span className="relative block h-[1.4em] overflow-hidden" aria-live="polite">
      <span key={i} className="rl-rotate absolute inset-0 block">
        {phrases[i]}
      </span>
    </span>
  );
}
