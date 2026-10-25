"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { bid } from "@/app/subasta/actions";
import { itemStatus, minNextBid, type AuctionItemView, type LiveItem } from "@/lib/auction-shared";
import { formatPrice } from "@/lib/format";
import { haptic } from "@/lib/native";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

const SOON_MS = 60 * 60 * 1000;
const URGENT_MS = 5 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

function countdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${pad(m)}m`;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** El número "corre" hasta el valor nuevo en vez de saltar. */
function useCountUp(target: number, ms = 650): number {
  const [shown, setShown] = useState(target);
  const last = useRef(target);
  useEffect(() => {
    const from = last.current;
    if (from === target) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      last.current = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      setShown(last.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

function BidBox({ item, onLive }: { item: AuctionItemView; onLive: (l: LiveItem) => void }) {
  const min = minNextBid(item);
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [burst, setBurst] = useState(0);
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
        setBurst((b) => b + 1);
        haptic("success");
      }
      setMsg({ ok: !!r?.ok, text: r?.ok ? (r.message ?? "¡Puja registrada!") : (r?.error ?? "No se pudo pujar.") });
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2.5">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/50">$</span>
          <input
            inputMode="numeric"
            value={amount ? amount.toLocaleString("es-CO") : ""}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            aria-label={`Tu puja por ${item.name}`}
            disabled={pending}
            className="w-full rounded-full border border-white/20 bg-white/10 py-3 pl-7 pr-4 text-base font-semibold text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
          />
        </div>
        <span className="relative shrink-0">
          <button type="submit" disabled={pending || item.isLeader} className="au-btn relative h-full rounded-full bg-accent px-5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 active:scale-95 disabled:opacity-60">
            {pending ? "…" : item.isLeader ? "Vas ganando" : "Pujar"}
          </button>
          {burst > 0 && (
            <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} className="au-spark" style={{ ["--a" as string]: `${i * 30}deg`, ["--d" as string]: `${46 + (i % 3) * 14}px` }} />
              ))}
            </span>
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
        <span className="mr-1">Mínimo {formatPrice(min)}</span>
        {[1, 3, 5].map((k) => (
          <button key={k} type="button" onClick={() => setValue(String(min + item.minIncrement * k))} className="rounded-full border border-white/15 px-2.5 py-1 transition hover:border-accent hover:text-white active:scale-95">
            + {formatPrice(item.minIncrement * k)}
          </button>
        ))}
      </div>
      {msg && (
        <p role="status" className={`au-rise rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-accent/15 text-white"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}

/** Medidor de movimiento: se llena con cada puja. */
function Heat({ count }: { count: number }) {
  const pct = Math.min(100, count * 12.5);
  const label = count === 0 ? "Sin pujas" : count < 3 ? "Calentando" : count < 6 ? "Se está moviendo" : "Muy disputado";
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-white/50">
        <span>{count >= 3 ? "🔥 " : ""}{label}</span>
        <span>{count} {count === 1 ? "puja" : "pujas"}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="au-heat h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Card({ it, index, status, left, onLive }: { it: AuctionItemView; index: number; status: ReturnType<typeof itemStatus>; left: number; onLive: (l: LiveItem) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const price = useCountUp(it.bidCount > 0 ? it.currentBid : it.startPrice);
  const urgent = status === "open" && left < URGENT_MS;
  const winning = it.isLeader && status === "open";

  // Inclinación suave siguiendo el mouse (solo en equipos con puntero).
  function tilt(e: React.PointerEvent<HTMLLIElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
  }
  const untilt = () => ref.current && (ref.current.style.transform = "");

  return (
    <li
      ref={ref}
      onPointerMove={tilt}
      onPointerLeave={untilt}
      style={{ animationDelay: `${index * 70}ms` }}
      className={`au-card au-rise group flex flex-col overflow-hidden rounded-3xl border bg-white/5 backdrop-blur ${winning ? "au-win border-emerald-400/60" : urgent ? "au-hot border-accent/70" : "border-white/10"}`}
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        {it.image && <Image src={it.image} alt={`${it.brand} ${it.name}`} fill unoptimized sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-contain p-4 transition duration-500 ease-out group-hover:scale-110" />}
        <span className="au-sheen" aria-hidden="true" />
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider tabular-nums ${status === "open" ? (urgent ? "au-urgent bg-accent text-white" : "bg-black/80 text-white") : "bg-black/60 text-white/80"}`}>
          {status === "upcoming" ? "Aún no abre" : status === "open" ? `${urgent ? "⏱ " : ""}Cierra en ${countdown(left)}` : "Cerrada"}
        </span>
        {winning && <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg">Vas ganando</span>}
        <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/90">Lote {pad(index + 1)}</span>
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
            <p key={it.bidCount} className="au-flash font-display text-4xl tabular-nums tracking-wide text-accent">{formatPrice(price)}</p>
          </div>
          {it.leader && (
            <div className="text-right text-xs text-white/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Líder</p>
              <p>{it.leader}</p>
            </div>
          )}
        </div>

        {status !== "upcoming" && <Heat count={it.bidCount} />}

        {status === "open" && <BidBox item={it} onLive={onLive} />}
        {status === "upcoming" && <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">Las pujas abren con la subasta. Mientras tanto, mira los pares.</p>}
        {status === "closed" && (
          <div className="mt-4 rounded-lg bg-white/5 px-3 py-3 text-sm">
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
}

/** Cuenta regresiva grande: abre en… / próximo cierre en… */
function Clock({ label, ms }: { label: string; ms: number }) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const parts: [string, string][] = [
    [pad(Math.floor(s / 86400)), "días"],
    [pad(Math.floor((s % 86400) / 3600)), "horas"],
    [pad(Math.floor((s % 3600) / 60)), "min"],
    [pad(s % 60), "seg"],
  ];
  return (
    <div className="text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">{label}</p>
      <div className="mt-2 flex items-start justify-center gap-2 sm:gap-3">
        {parts.map(([v, l], i) => (
          <div key={l} className="flex items-start gap-2 sm:gap-3">
            <div className="w-16 rounded-2xl border border-white/10 bg-white/5 py-2.5 backdrop-blur sm:w-20">
              <span key={v} className="au-tick block font-display text-4xl tabular-nums leading-none tracking-wide sm:text-5xl">{v}</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-white/45">{l}</span>
            </div>
            {i < parts.length - 1 && <span className="pt-2.5 font-display text-3xl text-accent/70 sm:text-4xl" aria-hidden="true">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

type Toast = { id: number; text: string; kind: "bid" | "lost" };
type Filter = "all" | "live" | "soon" | "mine";

/** Los pares de la subasta con precio, cuenta regresiva y pujas en vivo (se actualiza cada pocos segundos). */
export default function AuctionBoard({ startsAt, serverNow, initial }: { startsAt: number; serverNow: number; initial: AuctionItemView[] }) {
  const [items, setItems] = useState(initial);
  const [now, setNow] = useState(serverNow);
  const [filter, setFilter] = useState<Filter>("all");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const offset = useRef(0);
  const itemsRef = useRef(initial);
  const toastId = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    offset.current = serverNow - Date.now();
    const tick = setInterval(() => setNow(Date.now() + offset.current), 1000);
    const push = (text: string, kind: Toast["kind"]) => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, text, kind }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
    };
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/subasta", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { now: number; items: LiveItem[] };
        offset.current = data.now - Date.now();
        for (const l of data.items) {
          const prev = itemsRef.current.find((x) => x.id === l.id);
          if (!prev) continue;
          if (prev.isLeader && !l.isLeader) push(`Te superaron en ${prev.name}: ${formatPrice(l.currentBid)}`, "lost");
          else if (l.bidCount > prev.bidCount) push(`Nueva puja en ${prev.name}: ${formatPrice(l.currentBid)}`, "bid");
        }
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

  const view = useMemo(() => {
    const rows = items.map((it, i) => ({ it, i, status: itemStatus(startsAt, it.endsAt, now), left: it.endsAt - now }));
    const open = rows.filter((r) => r.status === "open");
    const filtered =
      filter === "live" ? open : filter === "soon" ? open.filter((r) => r.left < SOON_MS).sort((a, b) => a.left - b.left) : filter === "mine" ? rows.filter((r) => r.it.isLeader) : rows;
    const nextClose = open.length ? Math.min(...open.map((r) => r.left)) : 0;
    const bids = items.reduce((n, it) => n + it.bidCount, 0);
    const top = items.reduce((m, it) => (it.bidCount > 0 ? Math.max(m, it.currentBid) : m), 0);
    return { rows, open, filtered, nextClose, bids, top, mine: rows.filter((r) => r.it.isLeader && r.status === "open").length };
  }, [items, now, startsAt, filter]);

  if (items.length === 0) {
    return <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">Estamos cargando los pares. Vuelve en un momento.</p>;
  }

  const notStarted = now < startsAt;
  const allClosed = !notStarted && view.open.length === 0;
  const tabs: [Filter, string][] = [
    ["all", `Todos (${items.length})`],
    ["live", `En vivo (${view.open.length})`],
    ["soon", "Cierran pronto"],
    ["mine", `Voy ganando (${view.mine})`],
  ];

  return (
    <div>
      {/* cinta de pares corriendo */}
      <div className="pl-marquee -mx-5 border-y border-white/10 bg-black/30 py-2.5 sm:-mx-8" aria-hidden="true">
        <div className="pl-track">
          {[0, 1].flatMap((k) =>
            items.map((it) => (
              <span key={`${k}-${it.id}`} className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-white/70">
                <span className="text-accent">●</span>
                {it.name}
                <span className="text-white/40">{formatPrice(it.bidCount > 0 ? it.currentBid : it.startPrice)}</span>
              </span>
            ))
          )}
        </div>
      </div>

      <div className="mt-8">{allClosed ? <p className="text-center font-display text-3xl tracking-wide text-white/80">La subasta cerró</p> : <Clock label={notStarted ? "Abre en" : "Próximo cierre en"} ms={notStarted ? startsAt - now : view.nextClose} />}</div>

      <dl className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-3 text-center">
        {[
          ["Pares", String(items.length)],
          ["Pujas", String(view.bids)],
          ["Puja más alta", view.top ? formatPrice(view.top) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 backdrop-blur">
            <dd key={v} className="au-flash font-display text-base tabular-nums tracking-wide min-[430px]:text-2xl sm:text-3xl">{v}</dd>
            <dt className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">{k}</dt>
          </div>
        ))}
      </dl>

      <div role="tablist" aria-label="Filtrar pares" className="mt-8 flex flex-wrap justify-center gap-2">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={filter === k}
            onClick={() => setFilter(k)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition active:scale-95 ${filter === k ? "border-accent bg-accent text-white" : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view.filtered.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
          {filter === "mine" ? "Todavía no vas ganando ningún par. ¡Haz tu primera puja!" : filter === "soon" ? "Ningún par cierra en la próxima hora." : "No hay pares en vivo ahora mismo."}
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {view.filtered.map((r) => (
            <Card key={r.it.id} it={r.it} index={r.i} status={r.status} left={r.left} onLive={merge} />
          ))}
        </ul>
      )}

      {/* avisos de lo que pasa en vivo */}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col items-start gap-2 sm:right-auto" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={`au-toast pointer-events-auto max-w-sm rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur ${t.kind === "lost" ? "border-accent/60 bg-[#2a0f0b]/95 text-white" : "border-white/15 bg-black/85 text-white"}`}>
            {t.kind === "lost" ? "⚠️ " : "🔨 "}
            {t.text}
          </p>
        ))}
      </div>
    </div>
  );
}
