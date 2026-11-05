"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/native";
import { btnGhost, btnPrimary, cardCls } from "@/components/reseller/ui";

type State = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const DISMISS_KEY = "pits_webpush_dismissed";

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const post = (body: unknown) =>
  fetch("/api/avisos-web", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function detect(): Promise<State> {
  if (isNativeApp()) return "unsupported"; // en la app ya llegan los avisos del celular
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return ios && !standalone ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") {
      // Si otra persona entró con su cuenta en este mismo navegador, el aviso pasa a la cuenta actual.
      void post({ subscription: sub.toJSON() }).catch(() => undefined);
      return "on";
    }
  } catch {
    /* sin acceso al service worker: se ofrece activar */
  }
  return "off";
}

/**
 * Avisos del navegador (Web Push) para el panel de revendedores.
 * - banner: aparece solo mientras no los tiene activados (se puede descartar).
 * - completo (página Avisos): muestra el estado y permite activar, probar y desactivar.
 */
export default function WebPushToggle({ publicKey, banner = false }: { publicKey: string; banner?: boolean }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [dismissed, setDismissed] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    void (async () => {
      const s = await detect();
      let d = false;
      try {
        d = window.localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        /* sin almacenamiento: no se recuerda */
      }
      if (alive) {
        setDismissed(d);
        setState(s);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const res = await post({ subscription: sub.toJSON() });
      if (!res.ok) throw new Error("save");
      setState("on");
      await post({ test: true }).catch(() => undefined); // aviso de prueba: confirma que funciona
    } catch {
      setMsg("No pudimos activar los avisos. Revisa que el navegador los permita e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/avisos-web", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setMsg("No pudimos desactivarlos. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      const res = await post({ test: true });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setMsg(j.ok ? "Te mandamos un aviso de prueba." : "No llegó el aviso de prueba. Desactiva y vuelve a activar los avisos.");
    } catch {
      setMsg("No pudimos mandar el aviso de prueba.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* no se recuerda */
    }
  }

  if (state === "checking" || state === "unsupported") return null;
  // El banner del panel no se repite en la página Avisos, que ya trae el control completo.
  if (banner && (state !== "off" || dismissed || pathname.startsWith("/revendedores/avisos"))) return null;

  return (
    <section className={`${cardCls} mb-6 p-4 sm:p-5`} aria-label="Avisos del navegador">
      <p className="font-semibold">
        🔔 {state === "on" ? "Avisos del navegador activados" : "Recibe los avisos en este dispositivo"}
      </p>
      {state === "ios-install" ? (
        <p className="mt-1 text-sm text-muted">
          En iPhone los avisos funcionan desde la página instalada: toca <strong>Compartir</strong> → <strong>Agregar a pantalla de inicio</strong>, abre Pitsneakers desde ese ícono y activa los avisos aquí.
        </p>
      ) : state === "denied" ? (
        <p className="mt-1 text-sm text-muted">Los avisos están bloqueados en este navegador. Permítelos en la configuración del sitio (el candado junto a la dirección) y recarga la página.</p>
      ) : state === "on" ? (
        <p className="mt-1 text-sm text-muted">Te avisamos aquí cuando carguemos pares, cambien tus precios, respondamos una consulta o registremos una venta, aunque no tengas la página abierta.</p>
      ) : (
        <p className="mt-1 text-sm text-muted">Te avisamos cuando carguemos pares, cambien tus precios, respondamos una consulta o registremos una venta, sin depender del correo.</p>
      )}

      {state === "off" || state === "on" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {state === "off" ? (
            <>
              <button type="button" onClick={enable} disabled={busy} className={btnPrimary}>{busy ? "Activando…" : "Activar avisos"}</button>
              {banner ? <button type="button" onClick={dismiss} className={btnGhost}>Ahora no</button> : null}
            </>
          ) : (
            <>
              <button type="button" onClick={test} disabled={busy} className={btnGhost}>Enviar aviso de prueba</button>
              <button type="button" onClick={disable} disabled={busy} className={btnGhost}>Desactivar en este navegador</button>
            </>
          )}
        </div>
      ) : null}
      {msg ? <p role="status" className="mt-2 text-xs text-muted">{msg}</p> : null}
    </section>
  );
}
