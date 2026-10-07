"use client";

import { toggleFavorite, useFavorites } from "@/lib/favorites";

export default function FavoriteButton({ slug, name }: { slug: string; name: string }) {
  const active = useFavorites().includes(slug);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(slug)}
      aria-pressed={active}
      aria-label={active ? `Quitar ${name} de favoritos` : `Guardar ${name} en favoritos`}
      className={`fav-btn absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 ${active ? "text-accent" : "text-ink/60 hover:text-ink"}`}
    >
      <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${active ? "fav-pop" : ""}`} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
