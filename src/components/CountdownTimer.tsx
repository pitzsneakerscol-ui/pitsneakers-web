"use client";

import { useEffect, useState } from "react";

function getTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CountdownTimer({
  endsAt,
  onExpire,
  className = "",
}: {
  endsAt: string;
  onExpire?: () => void;
  className?: string;
}) {
  // Null hasta que el efecto corra en el cliente: evita un mismatch de
  // hidratación, ya que el conteo depende de la hora exacta de cada quien.
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft>>(null);

  useEffect(() => {
    const tick = () => {
      const next = getTimeLeft(endsAt);
      setTimeLeft(next);
      if (!next) {
        clearInterval(id);
        onExpire?.();
      }
    };
    // Se difiere al siguiente tick para no llamar setState de forma
    // síncrona dentro del cuerpo del efecto.
    const firstTick = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(firstTick);
      clearInterval(id);
    };
  }, [endsAt, onExpire]);

  if (!timeLeft) return null;

  const units: [number, string][] = [
    [timeLeft.days, "días"],
    [timeLeft.hours, "hrs"],
    [timeLeft.minutes, "min"],
    [timeLeft.seconds, "seg"],
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`} suppressHydrationWarning>
      {units.map(([value, label]) => (
        <div
          key={label}
          className="flex min-w-[3.25rem] flex-col items-center rounded-lg bg-ink px-2.5 py-2 text-white"
        >
          <span className="font-display text-xl tabular-nums leading-none sm:text-2xl">
            {pad(value)}
          </span>
          <span className="mt-1 text-[9px] uppercase tracking-widest text-white/60">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
