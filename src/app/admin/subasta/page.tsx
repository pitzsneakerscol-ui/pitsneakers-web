import type { Metadata } from "next";
import Image from "next/image";
import { getDb } from "@/lib/db";
import { getLatestAuction, listAdminItems, serverNow } from "@/lib/auction";
import { formatWhen, itemStatus, toLocalInput } from "@/lib/auction-shared";
import { isEmailConfigured } from "@/lib/email";
import { formatPrice } from "@/lib/format";
import { cardCls, btnGhost } from "@/components/reseller/ui";
import { AnnounceForm, AuctionForm, ItemForm } from "@/components/admin/AuctionForms";
import { deleteAuctionItem, notifyWinner } from "@/app/admin/subasta/actions";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Subasta" };

export default async function SubastaAdminPage() {
  const auction = await getLatestAuction();
  const items = auction ? await listAdminItems(auction.id) : [];
  const db = await getDb();
  const waiting = Number((await db.execute("SELECT COUNT(*) AS n FROM waitlist WHERE announced = 0")).rows[0].n);
  const now = serverNow();
  const defaultStart = toLocalInput(now + 3 * 86_400_000);
  const defaultEnd = toLocalInput(now + 4 * 86_400_000);
  const mail = isEmailConfigured();
  const base = siteConfig.siteUrl.replace(/\/$/, "");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Subasta exclusiva</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Solo entran los inscritos con pase (lista de espera). Enlace para compartir: <a className="underline" href={`${base}/subasta`} target="_blank" rel="noreferrer">{base}/subasta</a>
        </p>
      </header>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="mb-4 font-display text-2xl tracking-wide">1. Fechas</h2>
        <AuctionForm
          id={auction?.id}
          title={auction?.title ?? "Subasta exclusiva: 10 pares"}
          starts={auction ? toLocalInput(auction.startsAt) : defaultStart}
          ends={auction ? toLocalInput(auction.endsAt) : defaultEnd}
          published={auction?.published ?? false}
        />
      </section>

      {auction && (
        <>
          <section className={`${cardCls} p-5 sm:p-6`}>
            <h2 className="mb-4 font-display text-2xl tracking-wide">2. Pares ({items.length})</h2>
            {items.length > 0 && (
              <ul className="mb-6 space-y-3">
                {items.map((it) => {
                  const st = itemStatus(auction.startsAt, it.endsAt, now);
                  return (
                    <li key={it.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
                        <Image src={it.image} alt="" fill unoptimized sizes="64px" className="object-contain p-1" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{it.name}</p>
                        <p className="text-xs text-muted">
                          {it.size ? `Talla ${it.size} · ` : ""}Salida {formatPrice(it.startPrice)} · +{formatPrice(it.minIncrement)} · cierra {formatWhen(it.endsAt)}
                        </p>
                        <p className="text-sm">
                          {it.bidCount > 0 ? (
                            <>
                              <strong>{formatPrice(it.currentBid)}</strong> · {it.bidCount} pujas · {st === "closed" ? "ganador" : "va ganando"}: <span className="font-mono text-xs">{it.leaderEmail}</span>
                            </>
                          ) : (
                            <span className="text-muted">Sin pujas</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {st === "closed" && it.bidCount > 0 && (
                          <form action={notifyWinner}>
                            <input type="hidden" name="id" value={it.id} />
                            <button type="submit" disabled={!mail} className={btnGhost}>{it.winnerNotified ? "Reenviar al ganador" : "Avisar al ganador"}</button>
                          </form>
                        )}
                        <form action={deleteAuctionItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <button type="submit" className={btnGhost}>Quitar</button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <ItemForm auctionId={auction.id} />
          </section>

          <section className={`${cardCls} p-5 sm:p-6`}>
            <h2 className="mb-1 font-display text-2xl tracking-wide">3. Avisar a la lista</h2>
            <p className="mb-4 text-sm text-muted">Les llega un correo con la fecha de apertura y cierre, y el enlace para entrar con su pase.</p>
            <AnnounceForm auctionId={auction.id} pendingCount={waiting} />
          </section>
        </>
      )}
    </div>
  );
}
