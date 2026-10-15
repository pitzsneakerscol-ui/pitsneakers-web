"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import ProductMedia from "@/components/ProductMedia";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

interface SearchResult {
  slug: string;
  name: string;
  brand: string;
  colorway: string | null;
  category: "sneakers" | "streetwear";
  price: number;
  multiVariant: boolean;
  condition: "nuevo" | "usado";
  sizes: string[];
  image: string | null;
  order: number;
}

type Cat = "todo" | "sneakers" | "streetwear";
type Sort = "relevancia" | "menor" | "mayor";

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");
const RECENT_KEY = "pit-recent-searches";
const FAB_HINTS = ["Buscar mi par", "Jordan 4 Black Cat", "Dunk Low Panda", "Yeezy Slide", "Travis Scott", "Adidas Campus", "Nike Mind 001", "Mi talla: 9"];
const HINTS = ["Jordan 4 Military Black", "Dunk Low Panda", "Yeezy Slide", "Travis Scott", "Adidas Campus", "Nike Mind 001", "Supreme", "talla 9"];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(DIACRITICS_REGEX, "");
}

const words = (s: string) => normalize(s).split(/[^a-z0-9.]+/).filter(Boolean);

/** Distancia de edición <= 1 (tolera una letra de más, de menos o cambiada). */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.slice(i) === l.slice(i + 1);
}

/** 0 = no coincide. Todas las palabras buscadas deben aparecer (nombre, marca o colorway); tolera una errata en palabras largas. */
function scoreOf(p: SearchResult, q: string[]): number {
  if (q.length === 0) return 1;
  const hay = words(`${p.brand} ${p.name} ${p.colorway ?? ""}`);
  const nameWords = words(p.name);
  let total = 0;
  for (const t of q) {
    let best = 0;
    for (const w of hay) {
      if (w === t) best = Math.max(best, 4);
      else if (w.startsWith(t)) best = Math.max(best, t.length <= 1 ? 0 : 3);
      else if (t.length >= 3 && w.includes(t)) best = Math.max(best, 1.5);
      else if (t.length >= 5 && w.length >= 4 && near(w, t)) best = Math.max(best, 1);
    }
    if (best === 0) return 0;
    if (nameWords[0] && nameWords[0].startsWith(t)) best += 1;
    total += best;
  }
  return total;
}

/** Resalta en el texto las palabras buscadas (solo si el texto normalizado conserva el largo). */
function Highlight({ text, q }: { text: string; q: string[] }) {
  const norm = normalize(text);
  if (q.length === 0 || norm.length !== text.length) return <>{text}</>;
  const mark = new Array<boolean>(text.length).fill(false);
  for (const t of q) {
    if (!t) continue;
    let from = 0;
    for (;;) {
      const at = norm.indexOf(t, from);
      if (at === -1) break;
      for (let k = at; k < at + t.length; k++) mark[k] = true;
      from = at + t.length;
    }
  }
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && mark[j] === mark[i]) j++;
    const chunk = text.slice(i, j);
    out.push(mark[i] ? <mark key={i} className="srch-mark">{chunk}</mark> : <span key={i}>{chunk}</span>);
    i = j;
  }
  return <>{out}</>;
}

const sizeNum = (s: string) => {
  const n = parseFloat(s);
  return Number.isNaN(n) ? 999 : n;
};

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

/** Tenis de perfil (silueta simple) para la animación de la pista. */
function SneakerIcon() {
  return (
    <svg viewBox="0 0 34 16" className="srch-sneaker h-6 w-12" aria-hidden="true">
      <path d="M2 13v-2.2c0-1.4 1-2.4 2.4-2.6l5.2-.8L13 4.2c.5-.6 1.3-.7 2-.3l2.2 1.5 2.6.6c3.4.8 6.6 2.4 8.7 4.9.6.7.9 1.4.9 2.3V13Z" fill="currentColor" />
      <path d="M2 13.6h28.8" stroke="#ffd23f" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.2 4.6l1.6 2M15.4 3.6l1.6 2M17.6 4.4l1.5 1.9" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

/** Pista de carreras fina bajo el buscador: cada vez que cambia la búsqueda, un tenis la cruza dejando estela. */
function Track({ lap }: { lap: number }) {
  return (
    <div className="srch-track" aria-hidden="true">
      <span className="srch-track-line" />
      <span key={lap} className="srch-runner">
        <SneakerIcon />
      </span>
    </div>
  );
}

/** Encabezado de carrera: semáforo, título y un tenis que cruza la pista una y otra vez. */
function RaceBanner() {
  return (
    <div className="srch-banner relative mb-6 overflow-hidden rounded-xl bg-ink px-4 pb-6 pt-4 text-white sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="order-1 flex shrink-0 gap-1.5" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="srch-light srch-light-lg" style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
        <div className="order-3 min-w-0 basis-full sm:order-2 sm:basis-0 sm:flex-1">
          <p className="font-display text-3xl leading-none tracking-wide sm:text-3xl">
            ¿QUÉ PAR <span className="text-[#ffd23f]">BUSCAS</span> HOY?
          </p>
          <p className="mt-1.5 text-xs text-white/60">Largada: escribe, filtra por tu talla y llega primero.</p>
        </div>
        <span className="srch-flag order-2 ml-auto text-3xl sm:order-3 sm:ml-0" aria-hidden="true">🏁</span>
      </div>
      <div className="srch-banner-track" aria-hidden="true">
        <span className="srch-banner-runner">
          <SneakerIcon />
        </span>
      </div>
    </div>
  );
}

/** Semáforo de salida de la Fórmula 1: se encienden en cadena y pasan a verde. Se ve mientras carga el catálogo. */
function StartLights() {
  return (
    <div className="mb-6 flex flex-col items-center gap-2" role="status" aria-label="Cargando catálogo">
      <div className="flex items-center justify-center gap-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="srch-light srch-light-lg" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
      <span className="srch-go font-display text-xl tracking-[0.3em] text-ink">¡GO!</span>
    </div>
  );
}

const chipBase = "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95";
const chipOff = "border-line bg-paper-raised text-ink hover:border-ink";
const chipOn = "border-ink bg-ink text-white";

export default function FloatingSearchButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Cat>("todo");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState<Sort>("relevancia");
  const [active, setActive] = useState(0);
  const [hint, setHint] = useState(0);
  const [fab, setFab] = useState(0);
  const [compact, setCompact] = useState(false);
  const [lap, setLap] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [products, setProducts] = useState<SearchResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loading = open && products === null;

  const openSearch = useCallback(() => {
    setQuery("");
    setCat("todo");
    setSize("");
    setSort("relevancia");
    setActive(0);
    setLap((n) => n + 1);
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      setRecent(raw ? (JSON.parse(raw) as string[]).filter((x) => typeof x === "string").slice(0, 6) : []);
    } catch {
      setRecent([]);
    }
    setOpen(true);
  }, []);

  const saveRecent = useCallback((text: string) => {
    const t = text.trim();
    if (t.length < 2) return;
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [t, ...list.filter((x) => normalize(x) !== normalize(t))].slice(0, 6);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // sin almacenamiento: simplemente no se recuerda
    }
  }, []);

  const clearRecent = () => {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      // nada
    }
  };

  // La barra inferior del celular y los atajos de teclado (Ctrl/Cmd + K, o "/") abren este mismo buscador.
  useEffect(() => {
    const onOpen = () => openSearch();
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("pit:open-search", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pit:open-search", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, [openSearch]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Botón flotante: rota los ejemplos (se detiene si la pestaña está oculta o el buscador está abierto).
  useEffect(() => {
    if (open) return;
    const id = setInterval(() => {
      if (!document.hidden) setFab((n) => (n + 1) % FAB_HINTS.length);
    }, 2800);
    return () => clearInterval(id);
  }, [open]);

  // Se encoge a un círculo al bajar por la página y vuelve a su tamaño al subir (o al pasar el mouse por encima).
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 240) setCompact(false);
      else if (y > last + 6) setCompact(true);
      else if (y < last - 6) setCompact(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Placeholder animado: rota ejemplos mientras el buscador está vacío.
  useEffect(() => {
    if (!open || query) return;
    const id = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 2400);
    return () => clearInterval(id);
  }, [open, query]);

  useEffect(() => {
    if (!open || products !== null) return;
    let cancelled = false;
    fetch("/api/search-products")
      .then((res) => res.json())
      .then((data: SearchResult[]) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, products]);

  const q = useMemo(() => words(query), [query]);
  const hasFilter = q.length > 0 || size !== "";

  // Coincidencias por texto (antes de filtrar por categoría y talla): de aquí salen las tallas disponibles.
  const matches = useMemo(() => {
    if (!products) return [] as { p: SearchResult; s: number }[];
    return products
      .map((p) => ({ p, s: scoreOf(p, q) }))
      .filter((x) => x.s > 0 && (cat === "todo" || x.p.category === cat));
  }, [products, q, cat]);

  const sizesAvailable = useMemo(() => {
    const src = hasFilter ? matches.map((m) => m.p) : products ?? [];
    const set = new Set<string>();
    for (const p of src) for (const s of p.sizes) set.add(s);
    return [...set].sort((a, b) => sizeNum(a) - sizeNum(b) || a.localeCompare(b)).slice(0, 24);
  }, [matches, products, hasFilter]);

  const results = useMemo(() => {
    if (!hasFilter) return [];
    const list = matches.filter((m) => !size || m.p.sizes.includes(size));
    list.sort((a, b) => {
      if (sort === "menor") return a.p.price - b.p.price;
      if (sort === "mayor") return b.p.price - a.p.price;
      return b.s - a.s || b.p.order - a.p.order;
    });
    return list.map((m) => m.p).slice(0, 48);
  }, [matches, size, sort, hasFilter]);

  const popularBrands = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of products ?? []) count.set(p.brand, (count.get(p.brand) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([b]) => b);
  }, [products]);

  const latest = useMemo(() => [...(products ?? [])].sort((a, b) => b.order - a.order).slice(0, 10), [products]);

  const go = (p: SearchResult) => {
    saveRecent(query);
    setOpen(false);
    router.push(`/producto/${p.slug}`);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[Math.min(active, results.length - 1)]);
    }
  };

  // Mantiene visible el resultado seleccionado con el teclado.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const setQ = (v: string) => {
    setQuery(v);
    setActive(0);
    setLap((n) => n + 1);
  };

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Buscar tu par"
        className={`srch-fab fixed bottom-6 right-6 z-40 hidden h-14 items-center rounded-full bg-ink text-sm font-semibold text-white shadow-lg lg:flex ${compact ? "srch-fab-compact" : ""}`}
      >
        <span className="srch-fab-icon flex h-14 w-14 shrink-0 items-center justify-center">
          <SearchIcon />
        </span>
        <span className="srch-fab-label">
          <span className="srch-fab-stack" aria-hidden="true">
            {FAB_HINTS.map((h, i) => (
              <span key={h} className={i === fab ? "on" : (i + 1) % FAB_HINTS.length === fab ? "past" : ""}>{h}</span>
            ))}
          </span>
          <kbd className="hidden rounded border border-white/25 px-1.5 py-0.5 text-[10px] font-medium text-white/60 xl:inline">Ctrl K</kbd>
        </span>
      </button>

      {open && (
        <div className="srch-overlay fixed inset-0 z-[60] flex flex-col bg-paper" role="dialog" aria-modal="true" aria-label="Buscar tu par">
          {/* Barra de búsqueda */}
          <div className="relative border-b border-line bg-paper-raised px-4 pb-3 pt-4 sm:px-6">
            <div className="mx-auto flex max-w-4xl items-center gap-3">
              <SearchIcon className="h-5 w-5 shrink-0 text-accent" />
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onInputKey}
                  aria-label="Buscar por nombre, marca o modelo"
                  autoComplete="off"
                  className="w-full bg-transparent py-1 text-base text-ink focus:outline-none sm:text-lg"
                />
                {!query && (
                  <span key={hint} aria-hidden="true" className="srch-ph pointer-events-none absolute inset-y-0 left-0 flex max-w-full items-center truncate whitespace-nowrap text-base text-muted sm:text-lg">
                    Prueba: {HINTS[hint]}
                  </span>
                )}
              </div>
              {query && (
                <button type="button" onClick={() => setQ("")} className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink">
                  Borrar
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar búsqueda"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Filtros: categoría y talla */}
            <div className="mx-auto mt-3 max-w-4xl space-y-2">
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {(
                  [
                    ["todo", "Todo"],
                    ["sneakers", "Sneakers"],
                    ["streetwear", "Ropa y más"],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => { setCat(k); setActive(0); }} className={`${chipBase} ${cat === k ? chipOn : chipOff}`}>
                    {label}
                  </button>
                ))}
                <span className="mx-1 w-px shrink-0 bg-line" aria-hidden="true" />
                <span className="shrink-0 self-center text-[11px] font-semibold uppercase tracking-wider text-muted">Mi talla</span>
                {sizesAvailable.map((s) => (
                  <button key={s} type="button" onClick={() => { setSize(size === s ? "" : s); setActive(0); }} aria-pressed={size === s} className={`${chipBase} ${size === s ? "border-accent bg-accent text-white" : chipOff}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Track lap={lap} />

          {/* Contenido */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto max-w-4xl">
              {loading && <StartLights />}
              {loading && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4" aria-label="Cargando catálogo">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i}>
                      <div className="srch-skel aspect-square w-full rounded-md" />
                      <div className="srch-skel mt-3 h-3 w-2/3 rounded" />
                      <div className="srch-skel mt-2 h-3 w-1/3 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* Sin búsqueda: ideas para empezar */}
              {!loading && !hasFilter && (
                <div className="space-y-7">
                  <RaceBanner />
                  {recent.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Tus búsquedas</h2>
                        <button type="button" onClick={clearRecent} className="text-[11px] font-semibold uppercase tracking-wide text-muted hover:text-ink">Borrar</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recent.map((r) => (
                          <button key={r} type="button" onClick={() => setQ(r)} className={`${chipBase} ${chipOff}`}>
                            ↺ {r}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  <section>
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Marcas populares</h2>
                    <div className="flex flex-wrap gap-2">
                      {popularBrands.map((b, i) => (
                        <button key={b} type="button" onClick={() => setQ(b)} className={`srch-pop ${chipBase} ${chipOff}`} style={{ "--i": i } as React.CSSProperties}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Recién llegados</h2>
                    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                      {latest.map((p, i) => (
                        <Link
                          key={p.slug}
                          href={`/producto/${p.slug}`}
                          onClick={() => setOpen(false)}
                          className="srch-pop w-32 shrink-0 sm:w-40"
                          style={{ "--i": i } as React.CSSProperties}
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded-md bg-[#ebe8e2]">
                            <ProductMedia product={{ images: p.image ? [p.image] : [], brand: p.brand, name: p.name, category: p.category }} sizes="160px" />
                          </div>
                          <p className="mt-2 truncate text-[10px] uppercase tracking-wider text-muted">{p.brand}</p>
                          <p className="truncate text-xs font-medium text-ink">{p.name}</p>
                          <p className="text-xs font-semibold text-ink">{formatPrice(p.price)}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                  <p className="text-center text-xs text-muted">
                    Escribe un nombre, una marca o toca tu talla arriba. <span className="hidden sm:inline">Usa ↑ ↓ y Enter para moverte.</span>
                  </p>
                </div>
              )}

              {/* Resultados */}
              {!loading && hasFilter && (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted" aria-live="polite">
                      <strong className="text-ink">{results.length}</strong> {results.length === 1 ? "resultado" : "resultados"}
                      {size ? <> en talla <strong className="text-ink">{size}</strong></> : null}
                    </p>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      Ordenar
                      <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs font-semibold text-ink">
                        <option value="relevancia">Más relevantes</option>
                        <option value="menor">Precio: menor a mayor</option>
                        <option value="mayor">Precio: mayor a menor</option>
                      </select>
                    </label>
                  </div>

                  {results.length === 0 ? (
                    <div className="srch-pop mx-auto max-w-md py-10 text-center" style={{ "--i": 0 } as React.CSSProperties}>
                      <p className="font-display text-3xl tracking-wide">Pit stop: no lo encontramos… todavía</p>
                      <p className="mt-2 text-sm text-muted">
                        {size ? "Prueba quitando la talla o cambiando la búsqueda." : "Revisa la ortografía o prueba con la marca."} Si es un par que quieres de verdad, lo conseguimos por encargo.
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {popularBrands.slice(0, 5).map((b) => (
                          <button key={b} type="button" onClick={() => { setQ(b); setSize(""); }} className={`${chipBase} ${chipOff}`}>{b}</button>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Link href="/encargos" onClick={() => setOpen(false)} className="rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:bg-ink/90">
                          Pídelo por encargo
                        </Link>
                        <a
                          href={buildGeneralWhatsAppLink(`Hola! Estoy buscando: ${query || "un par"}${size ? ` en talla ${size}` : ""}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-whatsapp px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white hover:bg-whatsapp-dark"
                        >
                          Preguntar por WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                      {results.map((p, i) => (
                        <button
                          key={p.slug}
                          type="button"
                          data-i={i}
                          onClick={() => go(p)}
                          onMouseEnter={() => setActive(i)}
                          className={`srch-card group flex flex-col rounded-lg text-left ${i === active ? "srch-active" : ""}`}
                          style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
                        >
                          <span className="relative block aspect-square w-full overflow-hidden rounded-md bg-[#ebe8e2]">
                            <ProductMedia product={{ images: p.image ? [p.image] : [], brand: p.brand, name: p.name, category: p.category }} sizes="25vw" className="transition duration-500 group-hover:scale-[1.05]" />
                            {i === 0 && q.length > 0 && sort === "relevancia" && (
                              <span className="srch-p1 absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#ffd23f] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink shadow" title="La mejor coincidencia">
                                <span aria-hidden="true">🏁</span> P1
                              </span>
                            )}
                            {size && (
                              <span className="absolute bottom-2 left-2 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Talla {size}</span>
                            )}
                          </span>
                          <span className="mt-2 block min-w-0">
                            <span className="block truncate text-[11px] uppercase tracking-wider text-muted">
                              <Highlight text={p.brand} q={q} />
                            </span>
                            <span className="block truncate text-sm font-medium text-ink">
                              <Highlight text={p.name} q={q} />
                            </span>
                            {p.colorway && <span className="block truncate text-xs text-muted">{p.colorway}</span>}
                          </span>
                          <span className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-ink">
                              {p.multiVariant ? `Desde ${formatPrice(p.price)}` : formatPrice(p.price)}
                            </span>
                            <span className="truncate text-[10px] text-muted">
                              {p.sizes.length > 0 ? `Tallas ${p.sizes.slice(0, 3).join(", ")}${p.sizes.length > 3 ? "…" : ""}` : ""}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
