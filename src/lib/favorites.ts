"use client";

import { useSyncExternalStore } from "react";

// Favoritos guardados en el navegador (sin cuenta). Se sincronizan entre pestañas.
const KEY = "pit-favs";
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

export function toggleFavorite(slug: string) {
  const current = getSnapshot();
  cached = current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current].slice(0, 60);
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    /* sin almacenamiento: queda solo en memoria durante la visita */
  }
  emit();
}
