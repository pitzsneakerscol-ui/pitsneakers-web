"use client";

import { useEffect, useState } from "react";
import { isNativeApp, nativePlatform, plugin } from "@/lib/native";

type Call = (arg?: unknown) => Promise<unknown> & { remove?: () => void };
const call = (name: string, method: string): Call | undefined => {
  const p = plugin(name) as unknown as Record<string, Call> | undefined;
  return p?.[method];
};

async function sendToken(token: string) {
  try {
    await fetch("/api/dispositivos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, platform: nativePlatform() }) });
  } catch {
    /* se reintenta la próxima vez que se abra la app */
  }
}

/**
 * Solo hace algo dentro de la app móvil: marca la página como "app" y ofrece activar los avisos (trivia, subasta, ofertas).
 * El permiso se pide cuando la persona toca el botón, no al abrir la app.
 */
export default function NativeBridge() {
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.classList.add("native-app");
    const check = call("PushNotifications", "checkPermissions");
    const register = call("PushNotifications", "register");
    const addListener = call("PushNotifications", "addListener") as unknown as ((ev: string, cb: (d: { value: string }) => void) => Promise<unknown>) | undefined;
    if (!check || !register || !addListener) return;
    void addListener("registration", (d) => void sendToken(d.value));
    check()
      .then((r) => {
        const status = (r as { receive?: string }).receive;
        if (status === "granted") void register();
        else if (status === "prompt" || status === "prompt-with-rationale") setAsk(true);
      })
      .catch(() => undefined);
  }, []);

  async function enable() {
    setAsk(false);
    try {
      const req = call("PushNotifications", "requestPermissions");
      const register = call("PushNotifications", "register");
      const r = (await req?.()) as { receive?: string } | undefined;
      if (r?.receive === "granted") await register?.();
    } catch {
      /* permiso no concedido o Firebase sin configurar */
    }
  }

  if (!ask) return null;
  return (
    <div className="fixed inset-x-3 bottom-20 z-[60] rounded-2xl border border-white/15 bg-[#141417] p-4 text-white shadow-2xl lg:hidden" role="dialog" aria-label="Activar avisos">
      <p className="text-sm font-semibold">🔔 ¿Te avisamos?</p>
      <p className="mt-1 text-xs text-white/70">Activa los avisos para enterarte de la trivia del jueves, la subasta, tus ofertas y los pares nuevos.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={enable} className="flex-1 rounded-full bg-[#ee5a38] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Activar avisos</button>
        <button type="button" onClick={() => setAsk(false)} className="rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white/80">Ahora no</button>
      </div>
    </div>
  );
}
