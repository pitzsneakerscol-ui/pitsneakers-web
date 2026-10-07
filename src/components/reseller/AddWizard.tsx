"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { burstConfetti } from "@/lib/confetti";
import type { CatalogEntry } from "@/components/reseller/ItemFields";
import PairPreview from "@/components/reseller/PairPreview";
import { btnAccent, btnGhost, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
const digits = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;
const fmt = (v: string) => (v ? new Intl.NumberFormat("es-CO").format(Number(v)) : "");

const SHOE_SIZES = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "14"];
const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const STEPS = [
  { title: "¿Qué par es?", hint: "Búscalo en el catálogo o escríbelo", icon: "🔎" },
  { title: "Talla y estado", hint: "Toca las tallas que tienes", icon: "📏" },
  { title: "¿Cuánto?", hint: "Mira tu utilidad en vivo", icon: "💸" },
  { title: "Últimos detalles", hint: "Todo opcional", icon: "✨" },
];

function Money({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (digitsOnly: string) => void;
  placeholder: string;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="aw-card rounded-xl border border-line bg-paper-raised p-4 transition focus-within:border-ink focus-within:shadow-md">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-2xl text-muted">$</span>
        <input
          id={id}
          name={id}
          required={required}
          inputMode="numeric"
          autoComplete="off"
          value={fmt(value)}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
          placeholder={placeholder}
          className="w-full bg-transparent font-display text-3xl tracking-wide outline-none placeholder:text-ink/20"
        />
      </div>
      {children && <div className="mt-3 flex flex-wrap gap-1.5">{children}</div>}
    </div>
  );
}

const chipCls =
  "aw-chip rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold transition hover:border-ink hover:bg-white active:scale-95";

export default function AddWizard({
  catalog,
  today,
  action,
  pending,
  error,
  success,
  message,
  onReset,
  onClose,
}: {
  catalog: CatalogEntry[];
  today: string;
  action: (fd: FormData) => void;
  pending: boolean;
  error?: string;
  success: boolean;
  message?: string;
  onReset: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [warn, setWarn] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [colorway, setColorway] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [condition, setCondition] = useState<"nuevo" | "usado">("nuevo");
  const [qtyBySize, setQtyBySize] = useState<Record<string, number>>({});
  const [customSize, setCustomSize] = useState("");
  const [cost, setCost] = useState("");
  const [extra, setExtra] = useState("");
  const [expected, setExpected] = useState("");

  const successHost = useRef<HTMLDivElement>(null);

  const linked = useMemo(() => catalog.find((c) => c.slug === slug), [catalog, slug]);

  const matches = useMemo(() => {
    const tokens = norm(name).split(/\s+/).filter(Boolean);
    if (linked || name.trim().length < 2) return [];
    return catalog
      .filter((c) => {
        const hay = norm(`${c.brand} ${c.name} ${c.colorway}`);
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 6);
  }, [catalog, name, linked]);

  const sizeList = Object.entries(qtyBySize).filter(([, q]) => q > 0);
  const sizesValue = sizeList.map(([s, q]) => (q > 1 ? `${s}x${q}` : s)).join(", ");
  const totalPairs = sizeList.reduce((n, [, q]) => n + q, 0);
  const unitCost = digits(cost) + digits(extra);
  const exp = digits(expected);

  useEffect(() => {
    if (success) burstConfetti(successHost.current, 40);
  }, [success]);

  function pick(c: CatalogEntry) {
    setName(c.name);
    setBrand(c.brand);
    setColorway(c.colorway);
    setImageUrl(c.image);
    setSlug(c.slug);
  }

  function toggleSize(s: string) {
    setQtyBySize((prev) => {
      const next = { ...prev };
      if (next[s]) delete next[s];
      else next[s] = 1;
      return next;
    });
  }

  function addCustomSize() {
    const s = customSize.trim().slice(0, 12);
    if (!s) return;
    setQtyBySize((prev) => ({ ...prev, [s]: prev[s] ?? 1 }));
    setCustomSize("");
  }

  function validate(target: number): string | null {
    if (target > 0 && !name.trim()) return "Primero dinos qué par es.";
    if (target > 1 && totalPairs === 0) return "Elige al menos una talla.";
    if (target > 2 && cost === "") return "Escribe cuánto pagaste por el par (puede ser 0).";
    return null;
  }

  function go(target: number) {
    if (target > step) {
      const problem = validate(target);
      if (problem) {
        setWarn(problem);
        setShake((n) => n + 1);
        return;
      }
    }
    setWarn(null);
    setStep(Math.max(0, Math.min(STEPS.length - 1, target)));
  }

  if (success) {
    return (
      <div ref={successHost} className="relative overflow-hidden rounded-2xl bg-ink px-6 py-14 text-center text-white">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-400/25 blur-3xl" aria-hidden="true" />
        <svg viewBox="0 0 52 52" className="aw-check relative mx-auto h-20 w-20" fill="none" aria-hidden="true">
          <circle cx="26" cy="26" r="24" stroke="#3ddc84" strokeWidth="3" pathLength={1} className="aw-check-circle" />
          <path d="M15 27l8 8 14-17" stroke="#3ddc84" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="aw-check-mark" />
        </svg>
        <h3 className="relative mt-5 font-display text-3xl tracking-wide">¡LISTO!</h3>
        <p role="status" className="relative mt-2 text-sm text-white/70">{message}</p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onReset} className="btn-pop btn-shine relative rounded-full bg-accent px-7 py-3.5 text-xs font-semibold uppercase tracking-wide text-white">
            Agregar otro par
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-white/30 px-7 py-3.5 text-xs font-semibold uppercase tracking-wide hover:border-white">
            Ver mi inventario
          </button>
        </div>
      </div>
    );
  }

  const last = step === STEPS.length - 1;
  const pct = (step / (STEPS.length - 1)) * 100;

  return (
    <form
      onSubmit={(e) => {
        if (!last) {
          e.preventDefault();
          go(step + 1);
          return;
        }
        const problem = validate(STEPS.length);
        if (problem) {
          e.preventDefault();
          setWarn(problem);
          setShake((n) => n + 1);
          return;
        }
        submitWith(action)(e);
      }}
      onKeyDown={(e) => {
        // Enter avanza de paso en vez de enviar el formulario por accidente.
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && !last) {
          e.preventDefault();
          go(step + 1);
        }
      }}
    >
      <input type="hidden" name="catalogSlug" value={slug} />
      <input type="hidden" name="sizes" value={sizesValue} />
      <input type="hidden" name="condition" value={condition} />

      {/* Progreso */}
      <ol className="relative mb-6 grid grid-cols-4 gap-2">
        <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-[1.15rem] h-0.5 bg-line" />
        <span
          aria-hidden="true"
          className="absolute left-[12.5%] top-[1.15rem] h-0.5 bg-accent shadow-[0_0_10px_var(--color-accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct * 0.75}%` }}
        />
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s.title} className="relative flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={current ? "step" : undefined}
                className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-base transition-all duration-300 ${
                  done ? "border-accent bg-accent text-white" : current ? "scale-110 border-accent bg-paper-raised shadow-[0_0_0_6px_rgb(200_64_40/0.15)]" : "border-line bg-paper text-muted"
                }`}
              >
                {done ? "✓" : s.icon}
              </button>
              <span className={`mt-1.5 hidden text-[10px] font-semibold uppercase tracking-wider sm:block ${current ? "text-accent" : "text-muted"}`}>{s.title}</span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-4">
            <h3 className="font-display text-3xl tracking-wide">{STEPS[step].title}</h3>
            <p className="text-sm text-muted">{STEPS[step].hint}</p>
          </div>

          <div key={shake} className={warn ? "aw-shake" : ""}>
            {/* Paso 1: qué par */}
            <div className="aw-panel space-y-4" hidden={step !== 0}>
              <div className="relative">
                <label htmlFor="aw-name" className="sr-only">Par / modelo</label>
                <input
                  id="aw-name"
                  name="name"
                  maxLength={120}
                  autoComplete="off"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (slug && e.target.value !== linked?.name) setSlug("");
                  }}
                  placeholder="Ej: Dunk Low Panda, Jordan 4…"
                  className="w-full rounded-xl border-2 border-line bg-paper-raised px-4 py-4 text-lg font-medium outline-none transition placeholder:text-muted/50 focus:border-ink focus:shadow-lg"
                />
                <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted">🔎</span>
              </div>

              {matches.length > 0 && (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {matches.map((c, i) => (
                    <li key={c.slug} className="aw-pop" style={{ animationDelay: `${i * 50}ms` }}>
                      <button
                        type="button"
                        onClick={() => pick(c)}
                        className="aw-card group flex h-full w-full flex-col overflow-hidden rounded-xl border border-line bg-paper-raised text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-lg"
                      >
                        <span className="relative block aspect-[4/3] bg-[#ebe8e2]">
                          {c.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-contain p-2 mix-blend-multiply transition duration-300 group-hover:scale-110" />
                          )}
                        </span>
                        <span className="p-2.5">
                          <span className="block truncate text-xs font-semibold">{c.name}</span>
                          <span className="block truncate text-[11px] text-muted">{c.brand} · {formatPrice(c.price)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {linked ? (
                <p className="aw-pop flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  <span className="font-bold">✓ Vinculado al catálogo</span>
                  <span>Precio en Pitsneakers: <strong>{formatPrice(linked.price)}</strong></span>
                </p>
              ) : (
                name.trim().length >= 2 && matches.length === 0 && (
                  <p className="text-xs text-muted">No está en el catálogo: sin problema, escríbelo libre y completa los detalles.</p>
                )
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="aw-brand">Marca</label>
                  <input id="aw-brand" name="brand" maxLength={60} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Nike, Jordan, Adidas…" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="aw-colorway">Colorway</label>
                  <input id="aw-colorway" name="colorway" maxLength={80} value={colorway} onChange={(e) => setColorway(e.target.value)} placeholder="Panda, Bred…" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Paso 2: talla y estado */}
            <div className="aw-panel space-y-5" hidden={step !== 1}>
              <div>
                <p className={labelCls}>Tallas de zapatos (US)</p>
                <div className="flex flex-wrap gap-2">
                  {SHOE_SIZES.map((s) => {
                    const on = Boolean(qtyBySize[s]);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleSize(s)}
                        className={`aw-chip relative h-11 min-w-11 rounded-lg border-2 px-2 text-sm font-bold transition-all duration-200 active:scale-90 ${
                          on ? "scale-105 border-accent bg-accent text-white shadow-md" : "border-line bg-paper-raised hover:border-ink"
                        }`}
                      >
                        {s}
                        {on && qtyBySize[s] > 1 && <span className="aw-pop absolute -right-1.5 -top-1.5 rounded-full bg-ink px-1.5 text-[10px] text-white">×{qtyBySize[s]}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className={labelCls}>Ropa u otra talla</p>
                <div className="flex flex-wrap items-center gap-2">
                  {APPAREL_SIZES.map((s) => {
                    const on = Boolean(qtyBySize[s]);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleSize(s)}
                        className={`aw-chip h-11 min-w-11 rounded-lg border-2 px-3 text-sm font-bold transition-all duration-200 active:scale-90 ${
                          on ? "scale-105 border-accent bg-accent text-white shadow-md" : "border-line bg-paper-raised hover:border-ink"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                  <input
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        addCustomSize();
                      }
                    }}
                    maxLength={12}
                    placeholder="Otra…"
                    aria-label="Otra talla"
                    className="h-11 w-24 rounded-lg border-2 border-dashed border-line bg-transparent px-3 text-sm outline-none focus:border-ink"
                  />
                  <button type="button" onClick={addCustomSize} className="h-11 rounded-lg border-2 border-line px-3 text-sm font-bold hover:border-ink">+</button>
                </div>
              </div>

              {sizeList.length > 0 && (
                <ul className="space-y-2" aria-label="Cantidad por talla">
                  {sizeList.map(([s, q]) => (
                    <li key={s} className="aw-pop flex items-center justify-between rounded-xl border border-line bg-paper-raised px-4 py-2.5">
                      <span className="text-sm font-semibold">Talla {s}</span>
                      <span className="flex items-center gap-3">
                        <button type="button" aria-label={`Menos pares talla ${s}`} onClick={() => setQtyBySize((p) => (p[s] <= 1 ? Object.fromEntries(Object.entries(p).filter(([k]) => k !== s)) : { ...p, [s]: p[s] - 1 }))} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-lg hover:border-ink active:scale-90">−</button>
                        <span key={q} className="aw-pop w-6 text-center font-display text-xl">{q}</span>
                        <button type="button" aria-label={`Más pares talla ${s}`} onClick={() => setQtyBySize((p) => ({ ...p, [s]: Math.min(20, (p[s] ?? 0) + 1) }))} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-lg hover:border-ink active:scale-90">+</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <p className={labelCls}>Estado</p>
                <div className="relative grid grid-cols-2 rounded-xl bg-paper p-1" role="radiogroup" aria-label="Estado del par">
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-lg bg-ink shadow-md transition-transform duration-300 ease-out"
                    style={{ transform: condition === "nuevo" ? "translateX(0)" : "translateX(100%)" }}
                  />
                  {(
                    [
                      ["nuevo", "✨ Nuevo"],
                      ["usado", "👟 Usado"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={condition === key}
                      onClick={() => setCondition(key)}
                      className={`relative z-10 rounded-lg py-3 text-sm font-semibold transition-colors ${condition === key ? "text-white" : "text-muted"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Paso 3: cuánto */}
            <div className="aw-panel space-y-3" hidden={step !== 2}>
              <Money id="cost" label="Cuánto pagaste por par *" value={cost} onChange={setCost} placeholder="350.000" />
              <Money id="extraCost" label="Costos extra (envío, importación…)" value={extra} onChange={setExtra} placeholder="0">
                {[0, 10000, 20000, 50000].map((v) => (
                  <button key={v} type="button" onClick={() => setExtra(v === 0 ? "" : String(v))} className={chipCls}>
                    {v === 0 ? "Sin extra" : `+${formatPrice(v)}`}
                  </button>
                ))}
              </Money>
              <Money id="expectedPrice" label="Cuánto esperas cobrar" value={expected} onChange={setExpected} placeholder="520.000">
                {[15, 25, 40].map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={unitCost === 0}
                    onClick={() => setExpected(String(Math.round((unitCost * (1 + p / 100)) / 1000) * 1000))}
                    className={`${chipCls} disabled:opacity-40`}
                  >
                    +{p}% sobre el costo
                  </button>
                ))}
                {linked && (
                  <button type="button" onClick={() => setExpected(String(linked.price))} className={`${chipCls} border-accent text-accent`}>
                    Precio Pitsneakers {formatPrice(linked.price)}
                  </button>
                )}
              </Money>
              <p className="text-xs text-muted">La utilidad se calcula con el costo total ({formatPrice(unitCost)}) y se aplica a cada par.</p>
            </div>

            {/* Paso 4: detalles */}
            <div className="aw-panel space-y-4" hidden={step !== 3}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="aw-date">Fecha de compra</label>
                  <input id="aw-date" name="purchaseDate" type="date" max={today} defaultValue={today} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="aw-source">Proveedor / dónde lo compraste</label>
                  <input id="aw-source" name="source" maxLength={80} placeholder="Tienda, persona, país…" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="aw-sku">Código de estilo (SKU)</label>
                  <input id="aw-sku" name="sku" maxLength={40} placeholder="DD1391-100" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="aw-img">Foto (link opcional)</label>
                  <input id="aw-img" name="imageUrl" maxLength={300} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="aw-notes">Notas</label>
                <textarea id="aw-notes" name="notes" maxLength={500} rows={2} placeholder="Defectos, con caja, extra laces…" className={inputCls} />
              </div>

              <div className="rounded-xl bg-ink p-4 text-sm text-white">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Vas a agregar</p>
                <p className="mt-1 font-display text-2xl tracking-wide">
                  {totalPairs} {totalPairs === 1 ? "par" : "pares"} <span className="text-accent">{name || "—"}</span>
                </p>
                <p className="mt-1 text-white/70">
                  Tallas {sizesValue || "—"} · Inversión <strong className="text-white">{formatPrice(unitCost * totalPairs)}</strong>
                  {exp > 0 && (
                    <>
                      {" · "}Utilidad esperada <strong className={exp - unitCost >= 0 ? "text-emerald-400" : "text-accent"}>{formatPrice((exp - unitCost) * totalPairs)}</strong>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {warn && <p role="alert" className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm font-medium text-accent">{warn}</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className={`${btnGhost} disabled:invisible`}>
              ← Atrás
            </button>
            {last ? (
              <button type="submit" disabled={pending} className={`${btnAccent} btn-shine relative`}>
                {pending ? "Guardando…" : "Guardar al inventario"}
              </button>
            ) : (
              <button type="submit" className={`${btnAccent} btn-shine relative`}>
                Siguiente →
              </button>
            )}
          </div>
        </div>

        {/* Vista previa en vivo */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Así va tu par</p>
          <PairPreview
            name={name}
            brand={brand}
            colorway={colorway}
            image={imageUrl}
            condition={condition}
            sizes={sizeList.map(([size, qty]) => ({ size, qty }))}
            cost={unitCost}
            expected={exp}
          />
        </div>
      </div>
    </form>
  );
}
