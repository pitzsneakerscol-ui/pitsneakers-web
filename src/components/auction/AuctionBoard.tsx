"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { bid } from "@/app/subasta/actions";
import { itemStatus, minNextBid, type AuctionItemView, type LiveItem } from "@/lib/auction-shared";
import { formatPrice } from "@/lib/format";
import { haptic } from "@/lib/native";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

function countdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${pad(m)}m`;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

function BidBox({ item, disabled, onLive }: { item: AuctionItemView; disabled: boolean; onLive: (l: LiveItem) => void }) {
  const min = minNextBid(item);
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  // Si el usuario no ha escrito nada, el campo muestra siempre la puja mínima actual.
  const shown = value === "" ? String(min) : value;
  const amount = Number(shown.replace(/\D/g, "")) || 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount < min) return setMsg({ ok: false, text: `La puja mínima ahora es ${formatPrice(min)}.` });
    if (amount > min * 2 && !window.confirm(`¿Seguro que quieres pujar ${formatPrice(amount)}? Es mucho más que la puja mínima (${formatPrice(min)}). Pujar es un compromiso de compra.`)) return;
    setPending(true);
    setMsg(null);
    startTransition(async () => {
      const r = await bid(item.id, amount);
      setPending(false);
      if (r?.item) onLive(r.item);
      if (r?.ok) {
        setValue("");
        haptic("success");
      }
      setMsg({ ok: !!r?.ok, text: r?.ok ? (r.message ?? "¡Puja registrada!") : (r?.error ?? "No se pudo pujar.") });
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/50">$</span>
          <input
            inputMode="numeric"
            value={amount ? amount.toLocaleString("es-CO") : ""}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            aria-label={`Tu puja por ${item.name}`}
            disabled={disabled || pending}
            className="w-full rounded-full border border-white/20 bg-white/10 py-3 pl-7 pr-4 text-base font-semibold text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
          />
        </div>
        <button type="submit" disabled={disabled || pending || item.isLeader} className="shrink-0 rounded-full bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50">
          {pending ? "…" : item.isLeader ? "Vas ganando" : "Pujar"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
        <span>Mínimo {formatPrice(min)}</span>
        <button type="button" onClick={() => setValue(String(min + item.minIncrement))} className="rounded-full border border-white/15 px-2.5 py-1 hover:border-white/40 hover:text-white">
          + {formatPrice(item.minIncrement)}
        </button>
      </div>
      {msg && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-accent/15 text-white"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}

/** Los pares de la subasta con precio, cuenta regresiva y pujas en vivo (se actualiza cada pocos segundos). */
export default function AuctionBoard({ startsAt, serverNow, initial }: { startsAt: number; serverNow: number; initial: AuctionItemView[] }) {
  const [items, setItems] = useState(initial);
  const [now, setNow] = useState(serverNow);
  const offset = useRef(0);

  useEffect(() => {
    offset.current = serverNow - Date.now();
    const tick = setInterval(() => setNow(Date.now() + offset.current), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/subasta", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { now: number; items: LiveItem[] };
        offset.current = data.now - Date.now();
        setItems((cur) => cur.map((it) => ({ ...it, ...(data.items.find((l) => l.id === it.id) ?? {}) })));
      } catch {
        /* sin red: se reintenta en el próximo ciclo */
      }
    }, 4000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [serverNow]);

  const merge = (l: LiveItem) => setItems((cur) => cur.map((it) => (it.id === l.id ? { ...it, ...l } : it)));

  if (items.length === 0) {
    return <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">Estamos cargando los pares. Vuelve en un momento.</p>;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => {
        const status = itemStatus(startsAt, it.endsAt, now);
        const left = it.endsAt - now;
        const urgent = status === "open" && left < 5 * 60 * 1000;
        return (
          <li key={it.id} className={`flex flex-col overflow-hidden rounded-3xl border bg-white/5 backdrop-blur ${it.isLeader && status === "open" ? "border-emerald-400/60" : "border-white/10"}`}>
            <div className="relative aspect-square bg-white">
              {it.image && <Image src={it.image} alt={`${it.brand} ${it.name}`} fill unoptimized sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-contain p-4" />}
              <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${status === "open" ? (urgent ? "au-urgent bg-accent text-white" : "bg-black/80 text-white") : "bg-black/60 text-white/80"}`}>
                {status === "upcoming" ? "Aún no abre" : status === "open" ? `Cierra en ${countdown(left)}` : "Cerrada"}
              </span>
              {it.isLeader && status === "open" && <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">Vas ganando</span>}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {it.brand}
                {it.size ? ` · Talla ${it.size}` : ""} · {it.condition}
              </p>
              <h3 className="mt-1 font-display text-2xl leading-tight tracking-wide">{it.name}</h3>
              {it.description && <p className="mt-1 text-sm text-white/60">{it.description}</p>}

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{it.bidCount > 0 ? "Puja más alta" : "Precio de salida"}</p>
                  <p className="font-display text-4xl tracking-wide text-accent">{formatPrice(it.bidCount > 0 ? it.currentBid : it.startPrice)}</p>
                </div>
                <div className="text-right text-xs text-white/60">
                  <p>{it.bidCount} {it.bidCount === 1 ? "puja" : "pujas"}</p>
                  {it.leader && <p>Líder: {it.leader}</p>}
                </div>
              </div>

              {status === "open" && <BidBox item={it} disabled={false} onLive={merge} />}
              {status === "upcoming" && <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">Las pujas abren con la subasta. Mientras tanto, mira los pares.</p>}
              {status === "closed" && (
                <div className="mt-3 rounded-lg bg-white/5 px-3 py-3 text-sm">
                  {it.bidCount === 0 ? (
                    <p className="text-white/70">Cerró sin pujas.</p>
                  ) : it.isLeader ? (
                    <>
                      <p className="font-semibold text-emerald-300">¡Ganaste este par por {formatPrice(it.currentBid)}!</p>
                      <a className="mt-1 inline-block underline underline-offset-4" target="_blank" rel="noreferrer" href={buildGeneralWhatsAppLink(`Hola! Gané ${it.name}${it.size ? ` talla ${it.size}` : ""} en la subasta por ${formatPrice(it.currentBid)}. ¿Cómo coordinamos el pago?`)}>
                        Coordinar el pago por WhatsApp
                      </a>
                    </>
                  ) : (
                    <p className="text-white/70">Ganó {it.leader} con {formatPrice(it.currentBid)}.</p>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
