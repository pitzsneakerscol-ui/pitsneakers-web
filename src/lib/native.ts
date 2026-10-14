"use client";

// Puente con la app móvil (Capacitor). Dentro de la app, `window.Capacitor` lo inyecta el contenedor nativo;
// en el navegador normal no existe y todas estas funciones no hacen nada.

interface CapPlugin {
  [method: string]: (...args: never[]) => Promise<unknown> & { remove?: () => void };
}
interface CapWindow {
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: Record<string, CapPlugin | undefined> };
}

const cap = (): CapWindow["Capacitor"] | undefined => (typeof window === "undefined" ? undefined : (window as unknown as CapWindow).Capacitor);

export const isNativeApp = (): boolean => Boolean(cap()?.isNativePlatform?.());
export const nativePlatform = (): "android" | "ios" | "web" => (cap()?.getPlatform?.() as "android" | "ios" | undefined) ?? "web";
export const plugin = (name: string): CapPlugin | undefined => cap()?.Plugins?.[name];

/** Vibración corta (acierto, puja registrada…). */
export function haptic(kind: "light" | "success" = "light"): void {
  try {
    const h = plugin("Haptics");
    if (!h) return;
    if (kind === "success") void (h.notification as unknown as (o: { type: string }) => Promise<unknown>)({ type: "SUCCESS" });
    else void (h.impact as unknown as (o: { style: string }) => Promise<unknown>)({ style: "LIGHT" });
  } catch {
    /* sin vibración disponible */
  }
}

/** Compartir: hoja nativa dentro de la app; en el navegador, la de Web Share si existe. */
export async function shareLink(opts: { title: string; text: string; url: string }): Promise<boolean> {
  try {
    const s = plugin("Share");
    if (s) {
      await (s.share as unknown as (o: typeof opts & { dialogTitle: string }) => Promise<unknown>)({ ...opts, dialogTitle: "Compartir" });
      return true;
    }
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share(opts);
      return true;
    }
  } catch {
    /* el usuario cerró la hoja */
  }
  return false;
}
