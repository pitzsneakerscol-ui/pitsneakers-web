"use client";

import { useEffect, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";

/** Tabla de equivalencias de calzado (referencia Nike/Jordan). Las demás marcas varían ±0,5. */
const EU: Record<number, number> = {
  5: 37.5, 5.5: 38, 6: 38.5, 6.5: 39, 7: 40, 7.5: 40.5, 8: 41, 8.5: 42, 9: 42.5, 9.5: 43,
  10: 44, 10.5: 44.5, 11: 45, 11.5: 45.5, 12: 46, 12.5: 47, 13: 47.5, 14: 48.5,
};
const MEN = Object.keys(EU).map(Number).sort((a, b) => a - b);
/** Largo interior de la horma en cm: 1 talla = 1 cm. */
const cmOf = (m: number) => 18 + m;
const fmt = (n: number) => String(n).replace(".", ",");

/** Talla del par ("9", "8.5", "7.5W") a su equivalente US hombre. Las de mujer (W) son hombre + 1,5. */
function toMen(size: string): number | null {
  const m = size.trim().match(/^(\d+(?:[.,]\d+)?)\s*(w)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return m[2] ? n - 1.5 : n;
}

interface Tip {
  title: string;
  text: string;
}

/** Orientación general por marca/modelo; no es una garantía de ajuste. */
function tipFor(brand: string, name: string): Tip {
  const b = `${brand} ${name}`.toLowerCase();
  if (/yeezy|slide/.test(b))
    return { title: "Yeezy / Slides", text: "Calzan holgados y abiertos: si estás entre dos tallas, pide la mayor." };
  if (/salomon/.test(b))
    return { title: "Salomon", text: "Calzan ajustados y estrechos. Si tienes pie ancho o usas medias gruesas, pide media talla más." };
  if (/asics|onitsuka|gel/.test(b))
    return { title: "Asics / Onitsuka Tiger", text: "Hormas algo estrechas. Si tienes pie ancho, pide media talla más." };
  if (/adidas|samba|gazelle|campus|superstar|adistar|sl ?72|handball|spezial/.test(b))
    return { title: "Adidas", text: "Calzan a tu talla pero son algo estrechos (Samba, Gazelle, Campus). Con pie ancho, sube media talla." };
  if (/new balance|\bnb\b|990|550|2002|9060/.test(b))
    return { title: "New Balance", text: "Calzan a tu talla habitual. Con pie ancho, sube media talla." };
  if (/jordan/.test(b))
    return { title: "Jordan", text: "Calzan a tu talla de Nike. Los Jordan 4 y 11 son un poco más ajustados: con pie ancho, sube media talla." };
  if (/air force|af1/.test(b))
    return { title: "Air Force 1", text: "Suelen quedar algo grandes: muchos piden media talla menos. Con pie ancho, tu talla habitual." };
  if (/dunk|sb|nike|mind|vomero|blazer|travis/.test(b))
    return { title: "Nike / Dunk", text: "Calzan a tu talla habitual. Si estás entre dos tallas, pide la mayor." };
  return { title: "Calce general", text: "Si estás entre dos tallas, pide la mayor. Confirma con nosotros si tienes dudas." };
}

export default function SizeHelp({
  brand,
  name,
  sizes,
}: {
  brand: string;
  name: string;
  /** Tallas disponibles de este par, como están publicadas (ej. "9", "7.5W"). */
  sizes: string[];
}) {
  const [open, setOpen] = useState(false);
  const [foot, setFoot] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const available = useMemo(() => {
    const set = new Set<number>();
    sizes.forEach((s) => {
      const m = toMen(s);
      if (m !== null) set.add(m);
    });
    return set;
  }, [sizes]);

  const tip = tipFor(brand, name);
  const footCm = parseFloat(foot.replace(",", "."));
  const valid = Number.isFinite(footCm) && footCm >= 20 && footCm <= 35;
  // Se deja ~0,5 cm de holgura delante del dedo más largo.
  const rec = valid ? MEN.find((m) => cmOf(m) >= footCm + 0.5) ?? MEN[MEN.length - 1] : null;
  const recAvailable = rec !== null && available.has(rec);
  const nearest =
    rec !== null && !recAvailable && available.size
      ? [...available].sort((a, b) => Math.abs(a - rec) - Math.abs(b - rec))[0]
      : null;

  const waText = `Hola! Quiero comprar ${brand} ${name} y necesito ayuda con la talla. Mi pie mide ${valid ? fmt(footCm) + " cm" : "___ cm"}.`;
  const waLink = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(waText)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent underline underline-offset-4"
      >
        ¿Qué talla pido?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Guía de tallas"
        >
          <div
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-paper p-5 text-ink sm:max-w-lg sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">Guía de tallas</p>
                <h2 className="mt-1 font-display text-2xl tracking-wide">¿Qué talla pido?</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted hover:border-ink hover:text-ink"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-line bg-paper-raised p-4">
              <p className="text-sm font-semibold">1. Mide tu pie</p>
              <p className="mt-1 text-xs text-muted">
                Apoya el pie en una hoja contra la pared y marca hasta el dedo más largo. Mide desde la pared hasta la marca, en centímetros.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={foot}
                  onChange={(e) => setFoot(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 26,5"
                  aria-label="Largo de tu pie en centímetros"
                  className="w-28 rounded-md border border-line bg-paper px-3 py-2 text-sm"
                />
                <span className="text-sm text-muted">cm</span>
              </div>
              {foot && !valid && <p className="mt-2 text-xs text-accent">Escribe un largo entre 20 y 35 cm.</p>}
              {rec !== null && (
                <div className="mt-3 rounded-lg bg-ink p-3 text-white">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">Tu talla recomendada</p>
                  <p className="mt-0.5 text-lg font-semibold">
                    US {fmt(rec)} hombre · US {fmt(rec + 1.5)} mujer · EU {fmt(EU[rec])}
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    {recAvailable
                      ? "✓ Esta talla está disponible en este par."
                      : nearest !== null
                        ? `Esta talla no está en este par. La más cercana disponible es la US ${fmt(nearest)}.`
                        : "Escríbenos para revisar si tenemos tu talla."}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-line bg-paper-raised p-4">
              <p className="text-sm font-semibold">2. Consejo para este par · {tip.title}</p>
              <p className="mt-1 text-sm text-muted">{tip.text}</p>
              <p className="mt-2 text-[11px] text-muted">Orientación general: cada modelo puede variar un poco.</p>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold">3. Equivalencias</p>
              <p className="mt-1 text-xs text-muted">
                Las tallas con W son de mujer: equivalen a la talla de hombre + 1,5. Resaltadas, las que hay en este par.
              </p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[320px] text-center text-xs">
                  <thead className="bg-paper-raised text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-2 py-2">US hombre</th>
                      <th className="px-2 py-2">US mujer</th>
                      <th className="px-2 py-2">EU</th>
                      <th className="px-2 py-2">CM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEN.map((m) => {
                      const has = available.has(m);
                      return (
                        <tr key={m} className={`border-t border-line ${has ? "bg-accent/10 font-semibold text-accent" : rec === m ? "bg-ink/5" : ""}`}>
                          <td className="px-2 py-1.5">{fmt(m)}</td>
                          <td className="px-2 py-1.5">{fmt(m + 1.5)}</td>
                          <td className="px-2 py-1.5">{fmt(EU[m])}</td>
                          <td className="px-2 py-1.5">{fmt(cmOf(m))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block rounded-full bg-[#25d366] px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white"
            >
              ¿Dudas? Pregúntanos por WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
