"use client";

import { useState } from "react";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

const TOPICS = [
  { key: "comprar", label: "Quiero comprar", emoji: "👟", ask: "¿Qué par buscas?", build: (item: string, size: string) => `Quiero comprar ${item || "un par"}${size ? ` en talla ${size}` : ""}.` },
  { key: "encargo", label: "Busco un encargo", emoji: "🔎", ask: "¿Qué par no encuentras?", build: (item: string, size: string) => `Quiero hacer un encargo VIP: ${item || "un par que no encuentro"}${size ? ` en talla ${size}` : ""}.` },
  { key: "vender", label: "Quiero vender", emoji: "💸", ask: "¿Qué quieres vender?", build: (item: string, size: string) => `Quiero vender ${item || "mis pares"}${size ? ` (talla ${size})` : ""} con Pitsneakers.` },
  { key: "verificar", label: "Verificar un par", emoji: "✅", ask: "¿Cuál par?", build: (item: string, size: string) => `Quiero que verifiquen ${item || "un par"}${size ? ` talla ${size}` : ""}.` },
  { key: "otro", label: "Otra consulta", emoji: "💬", ask: "¿Sobre qué?", build: (item: string) => (item ? `Tengo una consulta: ${item}.` : "Tengo una consulta sobre Pitsneakers.") },
] as const;

const inputCls =
  "w-full rounded-lg border border-line bg-paper-raised px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-ink/10";

/** Arma el mensaje de WhatsApp mientras escribes: eliges el tema y ves cómo sale. */
export default function MessageBuilder() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["key"]>("comprar");
  const [name, setName] = useState("");
  const [item, setItem] = useState("");
  const [size, setSize] = useState("");

  const t = TOPICS.find((x) => x.key === topic) ?? TOPICS[0];
  const message = `Hola! ${name.trim() ? `Soy ${name.trim()}. ` : ""}${t.build(item.trim(), size.trim())}`;

  return (
    <div className="grid gap-6 overflow-hidden rounded-2xl border border-line bg-paper-raised lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5 p-6 sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">1. ¿Qué necesitas?</p>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Tema del mensaje">
            {TOPICS.map((x) => {
              const on = x.key === topic;
              return (
                <button
                  key={x.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTopic(x.key)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                    on ? "scale-105 border-ink bg-ink text-white shadow-md" : "border-line hover:border-ink"
                  }`}
                >
                  <span aria-hidden="true">{x.emoji}</span>
                  {x.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">2. Cuéntanos más (opcional)</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_6rem]">
            <div>
              <label htmlFor="mb-item" className="sr-only">{t.ask}</label>
              <input id="mb-item" value={item} onChange={(e) => setItem(e.target.value)} maxLength={80} placeholder={t.ask} className={inputCls} />
            </div>
            <div>
              <label htmlFor="mb-size" className="sr-only">Talla</label>
              <input id="mb-size" value={size} onChange={(e) => setSize(e.target.value)} maxLength={8} placeholder="Talla" className={inputCls} />
            </div>
          </div>
          <label htmlFor="mb-name" className="sr-only">Tu nombre</label>
          <input id="mb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Tu nombre" className={`${inputCls} mt-3`} />
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-[#0b141a] p-6 text-white sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">3. Así saldrá tu mensaje</p>
          <div className="mt-4 flex justify-end">
            <p key={message} className="chat-bubble max-w-[90%] rounded-xl rounded-tr-sm bg-[#005c4b] px-3.5 py-2.5 text-sm leading-snug">
              {message}
              <span className="ml-2 inline-block text-[10px] text-white/50">✓✓</span>
            </p>
          </div>
        </div>
        <a
          href={buildGeneralWhatsAppLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pop btn-shine wa-pulse relative inline-flex items-center justify-center rounded-full bg-whatsapp px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-whatsapp-dark"
        >
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
