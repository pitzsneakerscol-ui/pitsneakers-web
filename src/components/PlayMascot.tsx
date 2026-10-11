"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import PointerTilt from "@/components/PointerTilt";
import { burstConfetti } from "@/lib/confetti";

const PHRASES = [
  "¡Auch! 😅",
  "¡Ey, cuidado con las medias!",
  "Todo verificado par a par ✅",
  "¿Buscas unos Jordan? 👟",
  "¡Otra vez, otra vez! 🔁",
  "Cuéntale a tus panas 📲",
  "Pssst… mira el catálogo",
  "¡Soy Pit! Mucho gusto 🤝",
  "Yo también quiero unos Dunk 👀",
  "Autenticidad garantizada 🔍",
];
const BOUNCE_PHRASES = ["¡Boing!", "¡Ay!", "¡Wooo!", "¡Eso dolió!", "¡Tiro de tres! 🏀"];

type Mode = "idle" | "drag" | "fly" | "return";

interface Phys {
  mode: Mode;
  x: number;
  y: number;
  rot: number;
  vx: number;
  vy: number;
  vr: number;
  /** punto donde agarraste a Pit, relativo a su posición */
  gx: number;
  gy: number;
  downX: number;
  downY: number;
  downT: number;
  moved: number;
  samples: { x: number; y: number; t: number }[];
  last: number;
  rest: number;
  frame: number;
}

const chance = (p: number) => Math.random() < p;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pick = <T,>(list: T[], not?: T): T => {
  const options = list.filter((x) => x !== not);
  return options[Math.floor(Math.random() * options.length)];
};

/**
 * La mascota del inicio: se puede tocar (salta y dice algo), arrastrar y lanzar (rebota por todo el banner y
 * vuelve a su sitio) y, si la tocas varias veces seguidas, arma fiesta con confeti.
 */
export default function PlayMascot() {
  const hostRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const squishRef = useRef<HTMLDivElement>(null);
  const physRef = useRef<Phys>({
    mode: "idle", x: 0, y: 0, rot: 0, vx: 0, vy: 0, vr: 0, gx: 0, gy: 0,
    downX: 0, downY: 0, downT: 0, moved: 0, samples: [], last: 0, rest: 0, frame: 0,
  });
  const tapsRef = useRef<number[]>([]);
  const totalRef = useRef(0);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastPhrase = useRef<string | undefined>(undefined);
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const phys = physRef.current;
    return () => {
      cancelAnimationFrame(phys.frame);
      clearTimeout(bubbleTimer.current);
    };
  }, []);

  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const say = (text: string, ms = 1900) => {
    lastPhrase.current = text;
    setBubble({ text, id: Date.now() });
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), ms);
  };

  const apply = () => {
    const p = physRef.current;
    const el = moverRef.current;
    if (!el) return;
    el.style.transform = p.mode === "idle" && !p.x && !p.y && !p.rot ? "" : `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rot}deg)`;
  };

  const squish = (kind: "jump" | "hit" | "party") => {
    const el = squishRef.current;
    if (!el || calm()) return;
    const frames: Record<string, Keyframe[]> = {
      jump: [
        { transform: "translateY(0) scale(1, 1)", offset: 0 },
        { transform: "translateY(4px) scale(1.14, 0.84)", offset: 0.16 },
        { transform: "translateY(-38px) scale(0.9, 1.12)", offset: 0.5 },
        { transform: "translateY(0) scale(1.1, 0.9)", offset: 0.8 },
        { transform: "translateY(0) scale(1, 1)", offset: 1 },
      ],
      hit: [
        { transform: "scale(1, 1)", offset: 0 },
        { transform: "scale(1.18, 0.82)", offset: 0.3 },
        { transform: "scale(0.94, 1.06)", offset: 0.65 },
        { transform: "scale(1, 1)", offset: 1 },
      ],
      party: [
        { transform: "rotate(0deg) scale(1)", offset: 0 },
        { transform: "rotate(360deg) scale(1.25)", offset: 0.5 },
        { transform: "rotate(720deg) scale(1)", offset: 1 },
      ],
    };
    el.animate(frames[kind], {
      duration: kind === "party" ? 900 : kind === "jump" ? 620 : 260,
      easing: kind === "party" ? "cubic-bezier(0.3, 0.7, 0.3, 1)" : "ease-out",
    });
  };

  const tap = () => {
    setPlayed(true);
    const now = Date.now();
    totalRef.current += 1;
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < 3500), now];
    squish("jump");
    if (tapsRef.current.length >= 5) {
      tapsRef.current = [];
      squish("party");
      burstConfetti(hostRef.current, 40);
      say("¡MODO FIESTA! 🎉", 2300);
    } else if (totalRef.current === 12) {
      say("¡Eres mi fan #1! 💛", 2300);
    } else {
      say(pick(PHRASES, lastPhrase.current));
    }
  };

  /* ---- Física del lanzamiento ---- */

  const bounds = () => {
    const host = hostRef.current;
    const mover = moverRef.current;
    const hero = host?.closest("section");
    if (!host || !mover || !hero) return null;
    const h = host.getBoundingClientRect();
    const s = hero.getBoundingClientRect();
    const half = mover.offsetWidth / 2;
    const cx = h.left + h.width / 2;
    const cy = h.top + h.height / 2;
    return {
      minX: s.left + half * 0.7 - cx,
      maxX: s.right - half * 0.7 - cx,
      minY: s.top + half * 0.6 - cy,
      maxY: s.bottom - half * 0.9 - cy,
    };
  };

  const loop = (now: number) => {
    const p = physRef.current;
    const dt = clamp((now - p.last) / 16.67, 0.2, 2.5);
    p.last = now;

    if (p.mode === "fly") {
      const b = bounds();
      p.vy += 0.42 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vx *= Math.pow(0.994, dt);
      p.vr *= Math.pow(0.985, dt);
      if (b) {
        let hit = 0;
        if (p.x < b.minX) { p.x = b.minX; p.vx = Math.abs(p.vx) * 0.78; p.vr = p.vx * 0.5; hit = Math.abs(p.vx); }
        if (p.x > b.maxX) { p.x = b.maxX; p.vx = -Math.abs(p.vx) * 0.78; p.vr = p.vx * 0.5; hit = Math.abs(p.vx); }
        if (p.y < b.minY) { p.y = b.minY; p.vy = Math.abs(p.vy) * 0.75; hit = Math.max(hit, Math.abs(p.vy)); }
        if (p.y > b.maxY) {
          p.y = b.maxY;
          hit = Math.max(hit, Math.abs(p.vy));
          p.vy = -Math.abs(p.vy) * 0.62;
          p.vx *= 0.9;
          p.vr *= 0.85;
          if (Math.abs(p.vy) < 1.6) p.vy = 0;
        }
        if (hit > 9) {
          squish("hit");
          if (chance(0.35)) say(pick(BOUNCE_PHRASES, lastPhrase.current), 1100);
        }
        const onFloor = p.y >= b.maxY - 0.5;
        p.rest = onFloor && Math.abs(p.vx) < 0.35 && Math.abs(p.vy) < 0.5 ? p.rest + dt : 0;
      }
      apply();
      if (p.rest > 70) {
        // Se queda quieto un momento y luego regresa a su lugar.
        p.rot = ((((p.rot + 180) % 360) + 360) % 360) - 180;
        p.mode = "return";
        p.rest = 0;
        p.vx = p.vy = p.vr = 0;
        p.last = now + 900;
      }
    } else if (p.mode === "return") {
      if (now >= p.last) {
        const k = 1 - Math.pow(0.86, dt);
        p.x += (0 - p.x) * k;
        p.y += (0 - p.y) * k;
        p.rot += (0 - p.rot) * k;
        if (Math.abs(p.x) < 0.4 && Math.abs(p.y) < 0.4 && Math.abs(p.rot) < 0.4) {
          p.x = p.y = p.rot = 0;
          p.mode = "idle";
          apply();
          squish("hit");
          return;
        }
        apply();
      }
    } else {
      return;
    }
    p.frame = requestAnimationFrame(loop);
  };

  const startLoop = (mode: "fly" | "return") => {
    const p = physRef.current;
    cancelAnimationFrame(p.frame);
    p.mode = mode;
    p.last = performance.now();
    p.rest = 0;
    p.frame = requestAnimationFrame(loop);
  };

  /* ---- Puntero: tocar y arrastrar ---- */

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const p = physRef.current;
    cancelAnimationFrame(p.frame);
    e.currentTarget.setPointerCapture(e.pointerId);
    p.mode = "drag";
    p.gx = e.clientX - p.x;
    p.gy = e.clientY - p.y;
    p.downX = e.clientX;
    p.downY = e.clientY;
    p.downT = performance.now();
    p.moved = 0;
    p.samples = [{ x: e.clientX, y: e.clientY, t: p.downT }];
    p.vx = p.vy = p.vr = 0;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = physRef.current;
    if (p.mode !== "drag") return;
    p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.downX, e.clientY - p.downY));
    if (p.moved < 8 || calm()) return;
    const t = performance.now();
    p.samples.push({ x: e.clientX, y: e.clientY, t });
    p.samples = p.samples.filter((s) => t - s.t < 90);
    const b = bounds();
    p.x = e.clientX - p.gx;
    p.y = e.clientY - p.gy;
    if (b) {
      p.x = clamp(p.x, b.minX, b.maxX);
      p.y = clamp(p.y, b.minY, b.maxY);
    }
    p.rot = clamp((e.clientX - p.downX) * 0.15, -25, 25);
    if (!bubble) say("¡Suéltame, suéltame! 😂", 1200);
    setPlayed(true);
    apply();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = physRef.current;
    if (p.mode !== "drag") return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const dragged = p.moved >= 8 && !calm();
    if (!dragged) {
      p.mode = p.x || p.y || p.rot ? "return" : "idle";
      if (p.mode === "return") startLoop("return");
      tap();
      return;
    }
    const first = p.samples[0];
    const lastS = p.samples[p.samples.length - 1];
    const span = Math.max(16, lastS.t - first.t);
    p.vx = clamp(((lastS.x - first.x) / span) * 16.67, -48, 48);
    p.vy = clamp(((lastS.y - first.y) / span) * 16.67, -48, 48);
    p.vr = p.vx * 0.6;
    if (Math.hypot(p.vx, p.vy) > 3) say(pick(["¡Wiiiii! 🚀", "¡Allá voy!", "¡Pitsss! 💨"], lastPhrase.current), 1200);
    startLoop("fly");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tap();
    }
  };

  return (
    <PointerTilt>
      <div ref={hostRef} className="relative h-32 w-32 sm:h-64 sm:w-64 lg:h-80 lg:w-80">
        <div
          ref={moverRef}
          role="button"
          tabIndex={0}
          aria-label="Juega con Pit, la mascota de Pitsneakers: tócala o arrástrala"
          className="mascot-play absolute inset-0 z-10 cursor-grab touch-none select-none outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div ref={squishRef} className="h-full w-full">
            <Image
              src="/logo-pitsneakers.png"
              alt="Pitsneakers"
              width={2048}
              height={2048}
              sizes="(min-width: 1024px) 320px, 256px"
              priority
              draggable={false}
              className="mascot pointer-events-none relative h-full w-full"
            />
          </div>
          {bubble && (
            <span
              key={bubble.id}
              aria-live="polite"
              className="mascot-bubble pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-lg sm:text-sm"
            >
              {bubble.text}
              <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-white" aria-hidden="true" />
            </span>
          )}
        </div>
        {!played && (
          <span className="mascot-hint pointer-events-none absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-1/3 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white sm:text-xs">
            👆 Tócame · arrástrame
          </span>
        )}
      </div>
    </PointerTilt>
  );
}
