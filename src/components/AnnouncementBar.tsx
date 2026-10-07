"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export interface AnnouncementProps {
  latest?: { name: string; slug: string };
  members: string;
  communityUrl: string;
  promo?: { title: string; endsAt: string };
}

interface Message {
  key: string;
  icon: string;
  text: React.ReactNode;
  href: string;
  external?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatLeft(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d > 0 ? `${d}d ` : ""}${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

/** Barra de anuncios en vivo: mensajes que rotan con datos reales del catálogo y, si hay promo vigente, su cuenta regresiva. */
export default function AnnouncementBar({ latest, members, communityUrl, promo }: AnnouncementProps) {
  const [now, setNow] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

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

  const messages = useMemo<Message[]>(() => {
    const list: Message[] = [];
    if (promoLive && promo) {
      list.push({
        key: "promo",
        icon: "⚡",
        text: (
          <>
            {promo.title} termina en <strong className="tabular-nums text-[#ffd23f]">{formatLeft(promoEnd - (now ?? 0))}</strong>
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
        href: `/producto/${latest.slug}`,
      });
    }
    list.push(
      { key: "verify", icon: "🛡️", text: <>Cada par pasa por verificación física antes de publicarse</>, href: "/verificacion" },
      {
        key: "community",
        icon: "💬",
        text: (
          <>
            Únete a <strong className="text-[#4cc9f0]">{members}</strong> sneakerheads en WhatsApp
          </>
        ),
        href: communityUrl,
        external: true,
      },
      { key: "vip", icon: "✨", text: <>¿No encuentras tu par? Pídelo por encargo VIP</>, href: "/encargos" }
    );
    return list;
  }, [promoLive, promo, promoEnd, now, latest, members, communityUrl]);

  useEffect(() => {
    if (paused || messages.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => i + 1), 4200);
    return () => clearInterval(id);
  }, [paused, messages.length]);

  const current = messages[index % messages.length];
  const linkCls = "ab-slide absolute inset-0 flex items-center gap-2 truncate font-medium text-white/90 hover:text-white";
  const body = (
    <>
      <span aria-hidden="true" className="text-sm">{current.icon}</span>
      <span className="truncate">{current.text}</span>
      <span aria-hidden="true" className="hidden text-white/40 sm:inline">→</span>
    </>
  );

  return (
    <div
      className="relative bg-gradient-to-r from-[#0d0d0e] via-[#1c1210] to-[#0d0d0e] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto flex h-9 max-w-7xl items-center gap-3 px-4 text-xs sm:px-6 lg:px-8">
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
          <span aria-hidden="true" className="nav-dot" style={{ ["--glow" as string]: "#ff5a3c" }} />
          En vivo
        </span>

        <div className="relative h-full min-w-0 flex-1" aria-live="off">
          {current.external ? (
            <a key={current.key} href={current.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
              {body}
            </a>
          ) : (
            <Link key={current.key} href={current.href} className={linkCls}>
              {body}
            </Link>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex" role="tablist" aria-label="Anuncios">
          {messages.map((m, i) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={i === index % messages.length}
              aria-label={`Anuncio ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index % messages.length ? "w-5 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
      </div>
      <span aria-hidden="true" className="ab-line absolute inset-x-0 bottom-0 h-px" />
    </div>
  );
}
