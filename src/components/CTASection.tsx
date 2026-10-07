"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import Image from "next/image";
import OdometerValue from "@/components/OdometerValue";

export interface ChatPair {
  name: string;
  image: string;
  size: string;
  price: string;
}

interface Message {
  who: string;
  text?: string;
  admin?: boolean;
  color: string;
  pair?: ChatPair; // mensaje con foto de un par
}

const ME = "Pitsneakers";

/** Guion de ejemplo con pares reales del catálogo: la tienda sube varios y alguien se interesa. */
function buildChat(pairs: ChatPair[]): Message[] {
  if (pairs.length < 3) {
    return [
      { who: "Andrés", text: "🔥 Cayó un Jordan 4 Military Black talla 9", color: "#53bdeb" },
      { who: "Valen", text: "¿Viene verificado?", color: "#ffd279" },
      { who: ME, text: "Verificado par por par ✅ Escríbenos y te lo separamos", admin: true, color: "#fff" },
      { who: ME, text: "Vendido 🎉 Gracias por la confianza, comunidad", admin: true, color: "#fff" },
    ];
  }
  const [first, second, third] = pairs;
  return [
    { who: ME, text: "📦 Llegaron pares nuevos, verificados uno por uno", admin: true, color: "#fff" },
    { who: ME, pair: first, admin: true, color: "#fff" },
    { who: ME, pair: second, admin: true, color: "#fff" },
    { who: ME, pair: third, admin: true, color: "#fff" },
    { who: "Andrés", text: `Me interesan los ${second.name} 👀 ¿Talla ${second.size} sigue disponible?`, color: "#53bdeb" },
    { who: ME, text: "Disponible ✅ Te lo separamos ahora mismo", admin: true, color: "#fff" },
    { who: "Andrés", text: "¡Listo, voy por ellos! 🙌", color: "#53bdeb" },
    { who: ME, text: "Vendido 🎉 Gracias por la confianza, comunidad", admin: true, color: "#fff" },
  ];
}

const VISIBLE = 4;

// "Reducir movimiento": en ese caso la conversación se muestra completa y quieta.
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.412-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.986.579 3.836 1.579 5.397L2 22l4.735-1.55A9.953 9.953 0 0 0 12.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.2a8.16 8.16 0 0 1-4.256-1.185l-.305-.181-3.045.997.996-2.968-.199-.31A8.163 8.163 0 0 1 3.8 12c0-4.522 3.679-8.2 8.201-8.2 4.521 0 8.199 3.678 8.199 8.2 0 4.522-3.678 8.2-8.199 8.2z" />
    </svg>
  );
}

export default function CTASection({ pairs = [] }: { pairs?: ChatPair[] }) {
  const CHAT = useMemo(() => buildChat(pairs), [pairs]);
  const root = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [counted, setCounted] = useState(false);
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0); // mensajes visibles
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setCounted(true);
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Guion de la conversación: escribe… → llega el mensaje → pausa → siguiente. Al terminar, reinicia.
  useEffect(() => {
    if (!inView || reduced) return;
    let delay: number;
    let next: () => void;
    if (typing) {
      delay = 1000;
      next = () => {
        setTyping(false);
        setShown((n) => n + 1);
      };
    } else if (shown < CHAT.length) {
      delay = shown === 0 ? 500 : 1400;
      next = () => setTyping(true);
    } else {
      delay = 4200;
      next = () => setShown(0);
    }
    const id = setTimeout(next, delay);
    return () => clearTimeout(id);
  }, [inView, reduced, typing, shown, CHAT.length]);

  const count = reduced ? CHAT.length : shown;
  const visible = CHAT.slice(Math.max(0, count - VISIBLE), count);
  const typingWho = CHAT[Math.min(shown, CHAT.length - 1)];

  return (
    <section ref={root} className="relative overflow-hidden bg-paper-raised py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8">
        <div className="text-center lg:text-left">
          <h2 className="font-display text-3xl leading-[1] tracking-wide text-balance sm:text-5xl">
            ÚNETE A LA COMUNIDAD <span className="text-accent">PITSNEAKERS</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted sm:text-base lg:mx-0">
            Sé el primero en enterarte de lanzamientos, drops y ofertas exclusivas
            de la comunidad de reventa más grande de Bogotá.
          </p>

          <div className="mt-6 flex justify-center gap-8 lg:justify-start" aria-label="Tamaño de la comunidad">
            {[
              { value: siteConfig.stats.whatsappMembers, label: "en WhatsApp" },
              { value: siteConfig.stats.instagramFollowers, label: "en Instagram" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-4xl tracking-wide text-ink sm:text-5xl">
                  <OdometerValue value={s.value} play={counted} />
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <a
              href={siteConfig.whatsappCommunityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pop btn-shine wa-pulse relative inline-flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-whatsapp-dark sm:w-auto"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Unirme al grupo
            </a>
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pop inline-flex w-full items-center justify-center rounded-full border border-ink/20 px-8 py-4 text-sm font-semibold uppercase tracking-wide text-ink hover:border-ink/50 sm:w-auto"
            >
              Seguir en Instagram
            </a>
          </div>
          <a
            href={buildGeneralWhatsAppLink("Hola! Quiero más información sobre Pitsneakers")}
            className="mt-4 inline-block text-xs text-muted underline underline-offset-4 hover:text-ink"
          >
            o escríbenos directo por WhatsApp
          </a>
        </div>

        {/* Chat de ejemplo: los mensajes llegan solos */}
        <div className="mx-auto w-full max-w-sm" aria-hidden="true">
          <div className="chat-float overflow-hidden rounded-2xl bg-[#0b141a] shadow-2xl ring-1 ring-black/10">
            <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-sm">
                P<span className="text-accent">S</span>
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold">Comunidad Pitsneakers</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-whatsapp" />
                  {typing ? `${typingWho.who} está escribiendo…` : `${siteConfig.stats.whatsappMembers} miembros`}
                </p>
              </div>
            </div>

            <div className="flex h-[26rem] flex-col justify-end gap-2 overflow-hidden px-3 py-3">
              {visible.map((m, i) => {
                const key = count - visible.length + i;
                return (
                  <div key={key} className={`chat-bubble flex ${m.admin ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-xl px-3 py-2 text-[13px] leading-snug text-white ${
                        m.admin ? "rounded-tr-sm bg-[#005c4b]" : "rounded-tl-sm bg-[#202c33]"
                      }`}
                    >
                      {!m.admin && (
                        <p className="mb-0.5 text-[11px] font-semibold" style={{ color: m.color }}>
                          {m.who}
                        </p>
                      )}
                      {m.pair && (
                        <div className="-mx-1 -mt-0.5 w-44 sm:w-48">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#ebe8e2]">
                            <Image src={m.pair.image} alt="" fill sizes="192px" className="object-contain p-2 mix-blend-multiply" />
                          </div>
                          <p className="mt-1.5 truncate px-0.5 text-[12px] font-semibold">{m.pair.name}</p>
                          <p className="px-0.5 text-[11px] text-white/70">
                            Talla {m.pair.size} · <span className="font-semibold text-white">{m.pair.price}</span>
                          </p>
                        </div>
                      )}
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className="chat-bubble flex justify-start">
                  <div className="flex items-center gap-1 rounded-xl rounded-tl-sm bg-[#202c33] px-3.5 py-3">
                    <span className="typing-dot" />
                    <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                    <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-muted">Así se mueve la comunidad · conversación de ejemplo</p>
        </div>
      </div>
    </section>
  );
}
