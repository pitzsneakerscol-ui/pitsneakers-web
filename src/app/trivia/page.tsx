import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PassForm from "@/components/auction/PassForm";
import TriviaPlayer from "@/components/trivia/TriviaPlayer";
import { leaveAuction } from "@/app/subasta/actions";
import { getBidder } from "@/lib/auction";
import { maskEmail } from "@/lib/auction-shared";
import { isDbConfigured } from "@/lib/db";
import { getState } from "@/lib/trivia";

export const metadata: Metadata = {
  title: "Trivia en vivo",
  description: "Juega la trivia en vivo de Pitsneakers y gana crédito para tu compra.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const shell = "theme-dark pl-root relative isolate min-h-screen overflow-hidden bg-paper text-ink";

export default async function TriviaPage() {
  if (!isDbConfigured()) {
    return (
      <div className={`${shell} flex items-center justify-center px-5`}>
        <p className="text-white/70">La trivia aún no está disponible.</p>
      </div>
    );
  }
  const bidder = await getBidder();

  if (!bidder) {
    return (
      <div className={`${shell} flex flex-col`}>
        <div className="pl-glow" aria-hidden="true" />
        <div className="pl-stripes" aria-hidden="true" />
        <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <div className="pl-logo -mb-8 -mt-6">
            <Image src="/logo-pitsneakers.png" alt="Pitsneakers" width={320} height={320} priority className="h-56 w-56 drop-shadow-[0_10px_40px_rgba(200,64,40,0.45)]" />
          </div>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">🎮 Solo con pase</span>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-wide sm:text-6xl">Trivia <span className="text-accent">en vivo</span></h1>
          <p className="mt-3 text-white/70">Entra con el correo con el que te inscribiste y tu pase personal. Gana crédito para comprar.</p>
          <div className="mt-6 w-full rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <PassForm next="/trivia" label="Entrar a la trivia" />
          </div>
          <p className="mt-5 text-sm text-white/60">
            ¿Aún no tienes pase?{" "}
            <Link href="/proximamente" className="font-semibold text-white underline underline-offset-4 hover:text-accent">Inscríbete aquí</Link>
          </p>
        </main>
      </div>
    );
  }

  const state = await getState(bidder.id);
  return (
    <div className={shell}>
      <div className="pl-glow" aria-hidden="true" />
      <div className="pl-stripes" aria-hidden="true" />
      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-5">
        <span className="font-display text-2xl tracking-wide sm:text-3xl">PIT<span className="text-accent">SNEAKERS</span></span>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="hidden sm:inline">Pase de {maskEmail(bidder.email)}</span>
          <form action={leaveAuction}>
            <button type="submit" className="rounded-full border border-white/20 px-4 py-2 font-semibold uppercase tracking-wider text-white/80 transition hover:border-white hover:text-white">Salir</button>
          </form>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-16">
        <TriviaPlayer initial={state} />
      </main>
    </div>
  );
}
