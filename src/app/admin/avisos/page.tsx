import type { Metadata } from "next";
import { countDevices, pushStatus } from "@/lib/push";
import { btnPrimary, cardCls, inputCls, labelCls, selectAutoCls } from "@/components/reseller/ui";
import { broadcast } from "./actions";

export const metadata: Metadata = { title: "Avisos en la app" };

export default async function AvisosPage({ searchParams }: { searchParams: Promise<{ ok?: string; f?: string; r?: string; e?: string }> }) {
  const { ok, f, r, e } = await searchParams;
  const status = pushStatus();
  const [all, ios, android] = await Promise.all([countDevices({ all: true }), countDevices({ all: true, platform: "ios" }), countDevices({ all: true, platform: "android" })]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Avisos en la app</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Notificaciones al celular de quienes instalaron la app. Algunas salen solas: el estado de un pedido, la respuesta a una oferta, cuando superan a alguien en la subasta y el recordatorio de la trivia el día que empieza. Aquí mandas uno tú, por ejemplo cuando llega un lanzamiento.
        </p>
      </header>

      {e ? <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">{e}</p> : null}
      {ok !== undefined ? (
        <p role="status" className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">
          Aviso enviado a {ok} celular{ok === "1" ? "" : "es"}.{Number(f) > 0 ? ` No llegó a ${f}.` : ""}{Number(r) > 0 ? ` Quitamos ${r} que ya no tienen la app.` : ""}
        </p>
      ) : null}

      <section className={`${cardCls} space-y-1 p-4 text-sm sm:p-5`}>
        <p className="font-semibold">Celulares registrados: {all} <span className="font-normal text-muted">(iPhone {ios} · Android {android})</span></p>
        <p className={status.android ? "text-emerald-700" : "text-amber-800"}>
          Android: {status.android ? "conectado a Firebase" : "falta FCM_SERVICE_ACCOUNT en Vercel (la cuenta de servicio de Firebase)"}
        </p>
        <p className={status.ios ? "text-emerald-700" : "text-amber-800"}>
          iPhone: {status.ios ? "conectado a Apple" : "faltan APNS_KEY, APNS_KEY_ID y APNS_TEAM_ID en Vercel (la llave .p8 de Apple)"}
        </p>
      </section>

      <form action={broadcast} className={`${cardCls} space-y-4 p-4 sm:p-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider">Nuevo aviso</h2>
        <div>
          <label className={labelCls} htmlFor="title">Título (máx. 60)</label>
          <input id="title" name="title" maxLength={60} required autoComplete="off" placeholder="Ej. Llegó el Jordan 4 Black Cat 🔥" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="body">Mensaje (máx. 160)</label>
          <input id="body" name="body" maxLength={160} required autoComplete="off" placeholder="Ej. Pocas tallas. Míralo antes de que se agote." className={inputCls} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="url">Qué abre al tocarlo (opcional)</label>
            <input id="url" name="url" autoComplete="off" placeholder="/sneakers  ·  /subasta  ·  /trivia" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="who">A quién</label>
            <select id="who" name="who" defaultValue="all" className={`${selectAutoCls} w-full`}>
              <option value="all">Todos</option>
              <option value="ios">Solo iPhone</option>
              <option value="android">Solo Android</option>
            </select>
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4" />
          <span>Confirmo que quiero mandar este aviso ahora. No se puede deshacer.</span>
        </label>
        <button type="submit" className={btnPrimary}>Enviar aviso</button>
      </form>
    </div>
  );
}
