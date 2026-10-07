"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductGroup } from "@/types/product";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; group: ProductGroup };

function Modal({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(`/api/producto/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((group: ProductGroup) => alive && setState({ status: "ready", group }))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Portal al <body>: así ningún ancestro con transform (hover de la tarjeta, animaciones) descoloca el modal.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vista rápida: ${name}`}
      className="quickview-backdrop fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="quickview-panel relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-paper p-5 sm:rounded-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow hover:bg-ink hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        {state.status === "loading" && (
          <div className="grid gap-8 md:grid-cols-2" aria-busy="true">
            <div className="aspect-square animate-pulse rounded-lg bg-[#ebe8e2]" />
            <div className="space-y-4 py-4">
              <div className="h-4 w-24 animate-pulse rounded bg-line" />
              <div className="h-8 w-3/4 animate-pulse rounded bg-line" />
              <div className="h-24 animate-pulse rounded bg-line" />
            </div>
          </div>
        )}
        {state.status === "error" && (
          <p className="py-16 text-center text-sm text-muted">
            No pudimos cargar este par.{" "}
            <Link href={`/producto/${slug}`} className="underline">Abrir su página</Link>
          </p>
        )}
        {state.status === "ready" && (
          <>
            <div className="grid gap-8 md:grid-cols-2">
              <ProductGallery group={state.group} />
              <ProductPurchasePanel group={state.group} />
            </div>
            <div className="mt-6 text-center">
              <Link href={`/producto/${slug}`} className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4 hover:text-accent">
                Ver página completa
              </Link>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function QuickViewButton({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="quick-btn absolute inset-x-3 bottom-3 z-10 rounded-full bg-white/95 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink shadow-sm transition hover:bg-ink hover:text-white"
      >
        Vista rápida
      </button>
      {open && <Modal slug={slug} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}
