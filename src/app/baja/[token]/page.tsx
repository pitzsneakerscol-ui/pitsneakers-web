import type { Metadata } from "next";
import Link from "next/link";
import { isTokenUnsubscribed } from "@/lib/campaigns";
import { unsubscribeAction } from "./actions";

export const metadata: Metadata = {
  title: "Darme de baja",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const box = "rounded-2xl border border-line bg-paper-raised p-8 text-center";
const link = "mt-5 inline-block text-xs font-semibold uppercase tracking-wide text-accent underline underline-offset-4";

export default async function BajaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const unsub = token === "prueba" ? null : await isTokenUnsubscribed(token);
  const state = token === "prueba" ? "prueba" : unsub === null ? "invalido" : unsub ? "baja" : "activo";

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Comunidad</p>
      <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">Correos de Pitsneakers</h1>
      <div className="mt-8">
        {state === "activo" && (
          <div className={box}>
            <h2 className="font-display text-3xl tracking-wide">¿Ya no quieres recibir nuestros correos?</h2>
            <p className="mt-2 text-sm text-muted">Te quitamos de la lista y no te volvemos a escribir.</p>
            <form action={unsubscribeAction} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="rounded-full bg-accent px-7 py-3 text-xs font-bold uppercase tracking-widest text-white">
                Sí, darme de baja
              </button>
            </form>
            <Link href="/" className={link}>No, volver a la página</Link>
          </div>
        )}
        {state === "baja" && (
          <div className={box}>
            <p className="text-4xl" aria-hidden="true">✅</p>
            <h2 className="mt-2 font-display text-3xl tracking-wide">Listo, ya no te escribiremos</h2>
            <p className="mt-2 text-sm text-muted">Quedaste fuera de la lista de correos. Si fue un error, escríbenos por WhatsApp y te volvemos a agregar.</p>
            <Link href="/" className={link}>Ir a Pitsneakers</Link>
          </div>
        )}
        {state === "prueba" && (
          <div className={box}>
            <h2 className="font-display text-3xl tracking-wide">Este es un correo de prueba</h2>
            <p className="mt-2 text-sm text-muted">En los correos reales, este enlace es personal de cada persona y sirve para darse de baja.</p>
          </div>
        )}
        {state === "invalido" && (
          <div className={box}>
            <h2 className="font-display text-3xl tracking-wide">Este enlace no es válido</h2>
            <p className="mt-2 text-sm text-muted">Puede que esté incompleto. Si quieres darte de baja, escríbenos por WhatsApp.</p>
            <Link href="/" className={link}>Ir a Pitsneakers</Link>
          </div>
        )}
      </div>
    </div>
  );
}
