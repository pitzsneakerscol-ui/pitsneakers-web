"use client";

import { useEffect } from "react";
import { trackMeta } from "@/lib/meta-client";

/**
 * Manda un evento de Meta una vez al mostrarse. Con `onceKey`, además lo recuerda en el navegador
 * para no repetirlo si la persona recarga la página (por ejemplo la de "pago recibido").
 */
export default function MetaTrack({ event, params, eventId, onceKey }: { event: string; params?: Record<string, unknown>; eventId?: string; onceKey?: string }) {
  const paramsKey = JSON.stringify(params ?? {});
  useEffect(() => {
    if (onceKey) {
      try {
        if (localStorage.getItem(onceKey)) return;
        localStorage.setItem(onceKey, "1");
      } catch {
        /* sin almacenamiento: se manda igual (con eventId Meta evita el duplicado) */
      }
    }
    trackMeta(event, JSON.parse(paramsKey), eventId);
  }, [event, paramsKey, eventId, onceKey]);
  return null;
}
