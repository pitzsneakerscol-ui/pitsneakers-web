"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/native";

/**
 * Hoja "Instala Pitsneakers" que sale al abrir la página desde un celular (como la de otras apps web):
 * - iPhone en un navegador que NO es Safari (Chrome, Instagram, Facebook, WhatsApp…): solo Safari puede instalar → "Ábrela en Safari" con el enlace para copiar.
 * - iPhone en Safari: los 3 pasos con dibujos (Compartir → Agregar a pantalla de inicio → Agregar).
 * - Android: botón "Instalar" si el navegador lo permite; si no, los pasos del menú; en navegadores dentro de otras apps, "Ábrela en Chrome".
 * No sale en la app instalada, ni dentro de la app nativa, ni al pagar o seguir un pedido. Al cerrarla no vuelve a salir por unos días.
 */

const SNOOZE_KEY = "pits_install_snooze";
const DONE_KEY = "pits_install_done";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const SKIP = /^\/(pago|comprar|pedido|politicas|baja|resena)(\/|$)/;

type Mode = "ios-safari" | "ios-other" | "android-native" | "android-steps" | "android-other";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const read = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
};

/** Qué guía mostrar según el celular y el navegador; null si no hay nada que ofrecer (computador, app ya instalada…). */
function detect(hasPrompt: boolean): Mode | null {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  if (!ios && !android) return null;
  if (ios) {
    // Safari es el único que puede instalar en iPhone; Chrome/Firefox/Edge y los navegadores dentro de apps no.
    const safari = /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA|FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|MicroMessenger|Twitter/i.test(ua);
    return safari ? "ios-safari" : "ios-other";
  }
  // Android: dentro de otras apps (Instagram, Facebook, WebView) no se instala; hay que abrirla en Chrome.
  if (/; wv\)|FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|MicroMessenger|Twitter/i.test(ua)) return "android-other";
  return hasPrompt ? "android-native" : "android-steps";
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
function PlusSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function Step({ n, children, icon }: { n: number; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-paper-raised px-4 py-3 text-[15px] leading-snug">
      <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{n}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {icon ? <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-line bg-paper text-ink">{icon}</span> : null}
    </li>
  );
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [href, setHref] = useState("");
  const deferred = useRef<InstallEvent | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const shown = useRef(false);

  // Decide si corresponde mostrarla, con un respiro para que la página se vea primero.
  useEffect(() => {
    if (shown.current || SKIP.test(pathname)) return;
    if (isNativeApp()) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || read(DONE_KEY) === "1") return;
    const snoozed = Number(read(SNOOZE_KEY) ?? 0);
    if (snoozed && Date.now() - snoozed < SNOOZE_MS) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // lo guardamos para ofrecerlo con nuestro propio botón
      deferred.current = e as InstallEvent;
    };
    const onInstalled = () => {
      write(DONE_KEY, "1");
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const t = window.setTimeout(() => {
      const m = detect(deferred.current !== null);
      if (!m) return;
      shown.current = true;
      setHref(window.location.href);
      setMode(m);
      setOpen(true);
    }, 1500);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    write(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = href;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* el enlace queda a la vista para copiarlo a mano */
      }
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function installNow() {
    const ev = deferred.current;
    if (!ev) return;
    await ev.prompt();
    const choice = await ev.userChoice.catch(() => null);
    deferred.current = null;
    if (choice?.outcome === "accepted") write(DONE_KEY, "1");
    setOpen(false);
  }

  if (!open || !mode) return null;

  const other = mode === "ios-other" || mode === "android-other";
  const browser = mode === "ios-other" ? "Safari" : "Chrome";
  const title = other ? `Ábrela en ${browser} para instalarla` : "Instala Pitsneakers en tu celular";
  const lead = other
    ? mode === "ios-other"
      ? <>En iPhone, Pitsneakers se instala desde <strong>Safari</strong>: este navegador no puede.</>
      : <>Pitsneakers se instala desde <strong>Chrome</strong>: este navegador no puede.</>
    : <>Entra más rápido, ve los pares nuevos primero y ábrela como una app, sin ocupar espacio.</>;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-paper px-5 pt-6 text-ink shadow-2xl"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apple-icon.png" alt="" width={64} height={64} className="h-16 w-16 rounded-2xl border border-line" />
          <h2 id="install-title" className="mt-3 font-display text-2xl leading-tight tracking-wide">{title}</h2>
          <p className="mt-1.5 text-sm text-muted">{lead}</p>
        </div>

        <ol className="mt-5 space-y-2.5">
          {mode === "ios-safari" ? (
            <>
              <Step n={1} icon={<ShareIcon />}>Toca <strong>Compartir</strong>, el cuadro con la flecha, abajo en Safari.</Step>
              <Step n={2} icon={<PlusSquareIcon />}>Desliza y toca <strong>Agregar a pantalla de inicio</strong>.</Step>
              <Step n={3}>Toca <strong>Agregar</strong> arriba a la derecha. ¡Listo!</Step>
            </>
          ) : mode === "android-steps" ? (
            <>
              <Step n={1} icon={<DotsIcon />}>Toca los <strong>tres puntos</strong> del navegador, arriba a la derecha.</Step>
              <Step n={2} icon={<PlusSquareIcon />}>Toca <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong>.</Step>
              <Step n={3}>Confirma con <strong>Instalar</strong>. ¡Listo!</Step>
            </>
          ) : other ? (
            <>
              <Step n={1}>Toca <strong>«Copiar enlace»</strong>.</Step>
              <Step n={2}>Abre <strong>{browser}</strong>, toca la barra de la dirección y pega.</Step>
              <Step n={3}>Toca <strong>«Instalar»</strong>{mode === "ios-other" ? " y sigue los pasos con dibujos" : ""}.</Step>
            </>
          ) : null}
        </ol>

        {other ? (
          <p className="mt-4 select-all break-all rounded-2xl border border-line bg-paper-raised px-4 py-3 text-[15px]">{href}</p>
        ) : null}

        <div className="mt-4 space-y-2.5">
          {mode === "android-native" ? (
            <button type="button" onClick={installNow} className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white active:scale-[0.98]">
              Instalar
            </button>
          ) : null}
          {other ? (
            <button type="button" onClick={copy} className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white active:scale-[0.98]">
              {copied ? "¡Enlace copiado!" : "Copiar enlace"}
            </button>
          ) : null}
          <button ref={closeRef} type="button" onClick={close} className="w-full rounded-full border border-line px-6 py-3 text-sm font-semibold text-muted active:scale-[0.98]">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
