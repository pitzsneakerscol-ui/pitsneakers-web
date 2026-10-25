import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PassForm from "@/components/auction/PassForm";
import AuctionBoard from "@/components/auction/AuctionBoard";
import AuctionBackdrop from "@/components/auction/AuctionBackdrop";
import { leaveAuction } from "@/app/subasta/actions";
import { getBidder, getPublishedAuction, listAuctionItems, serverNow } from "@/lib/auction";
import { formatWhen, maskEmail } from "@/lib/auction-shared";
import { isDbConfigured } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { prelaunch } from "@/config/prelaunch";

export const metadata: Metadata = {
  title: "Subasta exclusiva",
  description: "Subasta de pares exclusivos solo para inscritos con pase.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const shell = "theme-dark pl-root relative isolate min-h-screen overflow-hidden bg-paper text-ink";

export default async function SubastaPage() {
  if (!isDbConfigured()) {
    return (
      <div className={`${shell} flex items-center justify-center px-5`}>
        <p className="text-white/70">La subasta aún no está disponible.</p>
      </div>
    );
  }

  const bidder = await getBidder();

  if (!bidder) {
    return (
      <div className={`${shell} flex flex-col`}>
        <AuctionBackdrop />
        <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <div className="pl-logo -mb-8 -mt-6">
            <Image src="/logo-pitsneakers.png" alt="Pitsneakers" width={320} height={320} priority className="h-56 w-56 drop-shadow-[0_10px_40px_rgba(200,64,40,0.45)]" />
          </div>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">🔨 Solo con pase</span>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-wide sm:text-6xl">Subasta <span className="text-accent">exclusiva</span></h1>
          <p className="mt-3 text-white/70">{prelaunch.auctionPairs} pares que no están en el catálogo. Entra con el correo con el que te inscribiste y tu pase personal.</p>
          <div className="mt-6 w-full rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <PassForm />
          </div>
          <p className="mt-5 text-sm text-white/60">
            ¿Aún no tienes pase?{" "}
            <Link href="/proximamente" className="font-semibold text-white underline underline-offset-4 hover:text-accent">Inscríbete aquí</Link>
          </p>
        </main>
      </div>
    );
  }

  const auction = await getPublishedAuction();
  const items = auction ? await listAuctionItems(auction.id, bidder.id) : [];
  const now = serverNow();
  const started = auction ? now >= auction.startsAt : false;
  const visible = items.filter((i) => !i.locked);
  const hidden = items.length - visible.length;

  return (
    <div className={shell}>
      <AuctionBackdrop />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <span className="font-display text-2xl tracking-wide sm:text-3xl">
          PIT<span className="text-accent">SNEAKERS</span>
        </span>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="hidden sm:inline">Pase de {maskEmail(bidder.email)}</span>
          <form action={leaveAuction}>
            <button type="submit" className="rounded-full border border-white/20 px-4 py-2 font-semibold uppercase tracking-wider text-white/80 transition hover:border-white hover:text-white">Salir</button>
          </form>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        {!auction ? (
          <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
            <p className="text-4xl" aria-hidden="true">🔨</p>
            <h1 className="mt-2 font-display text-4xl tracking-wide">Ya estás dentro</h1>
            <p className="mt-2 text-white/70">Todavía no hay una subasta programada. Te avisamos por correo apenas tenga fecha.</p>
          </div>
        ) : (
          <>
            <section className="pt-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
                <span className="pl-dot" aria-hidden="true" /> {started ? "En vivo" : "Próxima subasta"}
              </span>
              <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-wide sm:text-7xl">{auction.title}</h1>
              <p className="mx-auto mt-3 max-w-2xl text-white/70">
                {started ? `Cierra ${formatWhen(auction.endsAt)} (hora de Colombia), salvo que alguien puje al final.` : `Abre ${formatWhen(auction.startsAt)} (hora de Colombia). Cada hora se desbloquea un par nuevo.`}
              </p>
            </section>

            <details className="mx-auto mt-6 max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur" open={!started}>
              <summary className="cursor-pointer font-semibold uppercase tracking-wider text-white">Cómo funciona</summary>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>Cada puja debe superar la anterior por al menos el incremento del par.</li>
                <li>Si alguien puja en los últimos 2 minutos, ese par se alarga 2 minutos más.</li>
                <li>Te avisamos por correo si te superan y si ganas.</li>
                <li>Pujar es un compromiso de compra: el ganador coordina el pago por WhatsApp y tiene 24 horas para pagar.</li>
                <li>Cada hora se desbloquea un par nuevo: los que aún no abren están en incógnito{hidden > 0 ? ` (ahora hay ${hidden})` : ""}. El último es el gran final.</li>
                {visible.length > 0 && <li>Los precios de salida van desde {formatPrice(Math.min(...visible.map((i) => i.startPrice)))}.</li>}
              </ul>
            </details>

            <div className="mt-8">
              <AuctionBoard key={visible.length} startsAt={auction.startsAt} serverNow={now} initial={items} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
