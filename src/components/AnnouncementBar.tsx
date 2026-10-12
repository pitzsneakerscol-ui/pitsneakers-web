"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export interface AnnouncementProps {
  latest?: { name: string; slug: string };
  members: string;
  communityUrl: string;
  promo?: { title: string; endsAt: string };
}

interface Message {
  key: string;
  icon: string;
  /** texto completo (pantallas grandes) */
  text: React.ReactNode;
  /** versión corta para el celular, para que nunca se corte la frase */
  short: React.ReactNode;
  href: string;
  external?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const CLOSE_KEY = "pit-announcement-closed-until";
const CLOSE_HOURS = 24;
const SWIPE_PX = 40;

function formatLeft(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d > 0 ? `${d}d ` : ""}${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

const iconBtn =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";

/**
 * Barra de anuncios en vivo. Mensajes que rotan con datos reales del catálogo y, si hay promo vigente, su cuenta regresiva.
 * - Se pausa al pasar el mouse, al enfocar con teclado, al mantener el dedo y con el botón de pausa.
 * - En el celular se desliza con el dedo; en escritorio hay flechas y puntos.
 * - Una barrita de progreso muestra cuánto falta para el siguiente mensaje.
 * - Se puede cerrar (se recuerda 24 horas) y respeta "reducir movimiento".
 */
export default function AnnouncementBar({ latest, members, communityUrl, promo }: AnnouncementProps) {
  const [now, setNow] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [closed, setClosed] = useState(false);
  const [calm, setCalm] = useState(false);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);

  const promoEnd = promo ? new Date(promo.endsAt).getTime() : 0;
  const promoLive = now !== null && promoEnd > now;

  // El reloj solo corre en el cliente (evita diferencias de hidratación) y solo si hay promo.
  useEffect(() => {
    if (!promo) return;
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [promo]);

  // Preferencias del dispositivo / del visitante, leídas una sola vez en el cliente.
  useEffect(() => {
    const t = setTimeout(() => {
      setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      try {
        const until = Number(window.localStorage.getItem(CLOSE_KEY));
        if (until > Date.now()) setClosed(true);
      } catch {
        // sin almacenamiento: la barra simplemente se muestra
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const messages = useMemo<Message[]>(() => {
    const list: Message[] = [];
    if (promoLive && promo) {
      const left = formatLeft(promoEnd - (now ?? 0));
      list.push({
        key: "promo",
        icon: "⚡",
        text: (
          <>
            {promo.title} termina en <strong className="tabular-nums text-[#ffd23f]">{left}</strong>
          </>
        ),
        short: (
          <>
            Promo termina en <strong className="tabular-nums text-[#ffd23f]">{left}</strong>
          </>
        ),
        href: "/lanzamientos",
      });
    }
    list.push({
      key: "stock",
      icon: "🔥",
      text: (
        <>
          <strong className="text-[#ff8a6b]">+1000</strong> pares y prendas publicados cada semana
        </>
      ),
      short: (
        <>
          <strong className="text-[#ff8a6b]">+1000</strong> pares nuevos cada semana
        </>
      ),
      href: "/sneakers",
    });
    if (latest) {
      list.push({
        key: "latest",
        icon: "👟",
        text: (
          <>
            Recién llegado: <strong className="text-[#3ddc84]">{latest.name}</strong>
          </>
        ),
        short: (
          <>
            Nuevo: <strong className="text-[#3ddc84]">{latest.name}</strong>
          </>
        ),
        href: `/producto/${latest.slug}`,
      });
    }
    list.push(
      {
        key: "verify",
        icon: "🛡️",
        text: <>Cada par pasa por verificación física antes de publicarse</>,
        short: <>Verificación física en cada par</>,
        href: "/verificacion",
      },
      {
        key: "community",
        icon: "💬",
        text: (
          <>
            Únete a <strong className="text-[#4cc9f0]">{members}</strong> sneakerheads en WhatsApp
          </>
        ),
        short: (
          <>
            Únete a <strong className="text-[#4cc9f0]">{members}</strong> en WhatsApp
          </>
        ),
        href: communityUrl,
        external: true,
      },
      {
        key: "vip",
        icon: "✨",
        text: <>¿No encuentras tu par? Pídelo por encargo VIP</>,
        short: <>¿No lo encuentras? Pídelo por encargo</>,
        href: "/encargos",
      }
    );
    return list;
  }, [promoLive, promo, promoEnd, now, latest, members, communityUrl]);

  if (closed) return null;

  const total = messages.length;
  const at = ((index % total) + total) % total;
  const current = messages[at];
  const paused = manualPause || hover || held;
  const auto = !calm && !manualPause;

  const go = (step: number) => {
    setDir(step >= 0 ? 1 : -1);
    setIndex((i) => i + step);
  };
  const goTo = (target: number) => {
    setDir(target >= at ? 1 : -1);
    setIndex(target);
  };

  const close = () => {
    setClosed(true);
    try {
      window.localStorage.setItem(CLOSE_KEY, String(Date.now() + CLOSE_HOURS * 3600 * 1000));
    } catch {
      // sin almacenamiento: se cierra solo en esta visita
    }
  };

  const linkCls =
    "ab-slide absolute inset-0 flex items-center gap-2 font-medium text-white/90 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";
  const body = (
    <>
      <span aria-hidden="true" className="shrink-0 text-sm">{current.icon}</span>
      <span className="min-w-0 flex-1 truncate sm:hidden">{current.short}</span>
      <span className="hidden min-w-0 flex-1 truncate sm:block">{current.text}</span>
      <span aria-hidden="true" className="hidden shrink-0 text-white/40 sm:inline">→</span>
    </>
  );
  const slideStyle = { ["--ab-from" as string]: `${dir * 22}px` } as React.CSSProperties;

  return (
    <div
      role="region"
      aria-roledescription="carrusel"
      aria-label="Anuncios de Pitsneakers"
      className="relative bg-gradient-to-r from-[#0d0d0e] via-[#1c1210] to-[#0d0d0e] text-white"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
    >
      <div className="mx-auto flex h-10 max-w-7xl items-center gap-2 px-3 text-xs sm:gap-3 sm:px-6 lg:px-8">
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
          <span aria-hidden="true" className="nav-dot" style={{ ["--glow" as string]: "#ff5a3c" }} />
          En vivo
        </span>

        <div
          className="relative h-full min-w-0 flex-1 touch-pan-y select-none"
          aria-live={auto && !paused ? "off" : "polite"}
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, moved: false };
            setHeld(true);
          }}
          onPointerMove={(e) => {
            const s = swipe.current;
            if (!s || s.moved) return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > SWIPE_PX) {
              s.moved = true;
              go(dx < 0 ? 1 : -1);
            }
          }}
          onPointerUp={() => setHeld(false)}
          onPointerCancel={() => {
            swipe.current = null;
            setHeld(false);
          }}
          onClickCapture={(e) => {
            // Si fue un deslizamiento, no se abre el enlace.
            if (swipe.current?.moved) {
              e.preventDefault();
              e.stopPropagation();
            }
            swipe.current = null;
          }}
        >
          {current.external ? (
            <a key={current.key} href={current.href} target="_blank" rel="noopener noreferrer" className={linkCls} style={slideStyle} draggable={false}>
              {body}
            </a>
          ) : (
            <Link key={current.key} href={current.href} className={linkCls} style={slideStyle} draggable={false}>
              {body}
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button type="button" aria-label="Anuncio anterior" onClick={() => go(-1)} className={`${iconBtn} hidden sm:flex`}>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
          </button>

          <div className="hidden items-center gap-1.5 px-1 lg:flex" role="tablist" aria-label="Elegir anuncio">
            {messages.map((m, i) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={i === at}
                aria-label={`Anuncio ${i + 1} de ${total}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === at ? "w-5 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </div>
          <span className="px-1 text-[10px] tabular-nums text-white/50 lg:hidden" aria-hidden="true">{at + 1}/{total}</span>

          <button type="button" aria-label="Siguiente anuncio" onClick={() => go(1)} className={`${iconBtn} hidden sm:flex`}>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>
          </button>

          {!calm && (
            <button
              type="button"
              aria-label={manualPause ? "Reanudar anuncios" : "Pausar anuncios"}
              aria-pressed={manualPause}
              onClick={() => setManualPause((p) => !p)}
              className={iconBtn}
            >
              {manualPause ? (
                <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true"><path d="M6 4.2v11.6a.8.8 0 0 0 1.2.7l9-5.8a.8.8 0 0 0 0-1.4l-9-5.8A.8.8 0 0 0 6 4.2Z" /></svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="3.4" height="12" rx="1" /><rect x="11.6" y="4" width="3.4" height="12" rx="1" /></svg>
              )}
            </button>
          )}

          <button type="button" aria-label="Cerrar anuncios" onClick={close} className={iconBtn}>
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        </div>
      </div>

      {/* Progreso hacia el siguiente mensaje: cuando termina, avanza (así la barra y la rotación nunca se desfasan). */}
      {auto && total > 1 ? (
        <span
          key={`${at}-${index}`}
          aria-hidden="true"
          className="ab-progress absolute bottom-0 left-0 h-0.5 w-full origin-left bg-gradient-to-r from-[#ff5a3c] via-[#ffd23f] to-[#3ddc84]"
          style={{ animationPlayState: paused ? "paused" : "running" }}
          onAnimationEnd={() => go(1)}
        />
      ) : (
        <span aria-hidden="true" className="ab-line absolute inset-x-0 bottom-0 h-px" />
      )}
    </div>
  );
}
