"use client";

import { useSyncExternalStore } from "react";

// Favoritos guardados en el navegador (sin cuenta). Se sincronizan entre pestañas.
const KEY = "pit-favs";
const MERGED_KEY = "pit-favs-cuenta";
const EMPTY: string[] = [];

let cached: string[] | null = null;
const listeners = new Set<() => void>();

function load(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string").slice(0, 60) : [];
  } catch {
    return [];
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): string[] {
  if (cached === null) cached = load();
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = load();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

// Con sesión de comprador, los favoritos también viajan a la cuenta (lista de deseos). Sin sesión siguen solo en el navegador.
let signedIn = false;

function pushRemote(body: object) {
  if (!signedIn) return;
  fetch("/api/cuenta/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);
}

/**
 * Primera vez que este navegador ve esta cuenta: junta los favoritos de los dos lados y sube los que faltaban.
 * Después, la cuenta manda (así un corazón quitado en otro dispositivo no vuelve a aparecer).
 */
export function syncWithAccount(serverSlugs: string[], buyerId: number) {
  signedIn = true;
  const local = getSnapshot();
  let merged: string[];
  let first = true;
  try {
    first = localStorage.getItem(MERGED_KEY) !== String(buyerId);
  } catch {
    /* sin almacenamiento */
  }
  if (first) {
    const onlyLocal = local.filter((s) => !serverSlugs.includes(s));
    if (onlyLocal.length > 0) pushRemote({ add: onlyLocal });
    merged = [...local, ...serverSlugs.filter((s) => !local.includes(s))].slice(0, 60);
    try {
      localStorage.setItem(MERGED_KEY, String(buyerId));
    } catch {
      /* sin almacenamiento */
    }
  } else {
    merged = serverSlugs.slice(0, 60);
  }
  if (merged.length === local.length && merged.every((s) => local.includes(s))) return;
  cached = merged;
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    /* sin almacenamiento */
  }
  emit();
}

export function toggleFavorite(slug: string) {
  const current = getSnapshot();
  const adding = !current.includes(slug);
  pushRemote({ slug, on: adding });
  cached = adding ? [slug, ...current].slice(0, 60) : current.filter((s) => s !== slug);
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    /* sin almacenamiento: queda solo en memoria durante la visita */
  }
  emit();
}
