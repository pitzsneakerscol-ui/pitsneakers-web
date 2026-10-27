import type { Metadata } from "next";
import Image from "next/image";
import { getDb } from "@/lib/db";
import { getLatestAuction, listAdminItems, serverNow } from "@/lib/auction";
import { formatWhen, itemStatus, toLocalInput } from "@/lib/auction-shared";
import { isEmailConfigured } from "@/lib/email";
import { formatPrice } from "@/lib/format";
import { cardCls, btnGhost } from "@/components/reseller/ui";
import { AnnounceForm, AuctionForm, EditItemForm, ItemForm, ReminderForm } from "@/components/admin/AuctionForms";
import { deleteAuctionItem, moveAuctionItem, notifyWinner, voidLeadingBid } from "@/app/admin/subasta/actions";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Subasta" };

export default async function SubastaAdminPage() {
  const auction = await getLatestAuction();
  const items = auction ? await listAdminItems(auction.id) : [];
  const db = await getDb();
  const waiting = Number((await db.execute("SELECT COUNT(*) AS n FROM waitlist WHERE announced = 0")).rows[0].n);
  const unreminded = auction ? Number((await db.execute({ sql: "SELECT COUNT(*) AS n FROM waitlist WHERE auction_reminded != ?", args: [auction.id] })).rows[0].n) : 0;
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
            <h2 className="mb-1 font-display text-2xl tracking-wide">2. Pares ({items.length})</h2>
            <p className="mb-4 text-sm text-muted">
              Se desbloquean en este orden: el primero cuando abre la subasta y uno nuevo cada hora. Hasta entonces los inscritos lo ven en incógnito (sin nombre, foto ni precio). El último es el gran final. La talla nunca se muestra a los inscritos.
            </p>
            {items.length > 0 && (
              <ul className="mb-6 space-y-3">
                {items.map((it, idx) => {
                  const st = itemStatus(auction.startsAt, it.endsAt, now);
                  return (
                    <li key={it.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-3">
                      <div className="flex shrink-0 flex-col items-center gap-1">
                        <form action={moveAuctionItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="dir" value="up" />
                          <button type="submit" disabled={idx === 0} aria-label={`Subir ${it.name}`} className={`${btnGhost} px-2 py-1`}>↑</button>
                        </form>
                        <span className="text-xs font-semibold text-muted">{idx + 1}</span>
                        <form action={moveAuctionItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="dir" value="down" />
                          <button type="submit" disabled={idx === items.length - 1} aria-label={`Bajar ${it.name}`} className={`${btnGhost} px-2 py-1`}>↓</button>
                        </form>
                      </div>
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
                        <Image src={it.image} alt="" fill unoptimized sizes="64px" className="object-contain p-1" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{it.name}{it.finale ? " · 🏁 gran final" : ""}</p>
                        <p className="text-xs text-muted">{it.opensAt <= now ? "Desbloqueado" : `Se desbloquea ${formatWhen(it.opensAt)}`}{it.opensAt >= it.endsAt ? " · ⚠️ queda después del cierre" : ""}</p>
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
                        {it.bidCount > 0 && (
                          <form action={voidLeadingBid} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={it.id} />
                            <button type="submit" name="block" value="0" className={btnGhost} title="Borra las pujas de quien va ganando este par; vuelve la puja más alta que quede">Anular puja</button>
                            <button type="submit" name="block" value="1" className={btnGhost} title="Anula sus pujas en todos los pares abiertos y no lo deja volver a pujar">Anular y bloquear</button>
                          </form>
                        )}
                        <form action={deleteAuctionItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <button type="submit" className={btnGhost}>Quitar</button>
                        </form>
                      </div>
                      <details className="group w-full basis-full">
                        <summary className={`${btnGhost} inline-flex cursor-pointer list-none`}>✏️ Editar este par</summary>
                        <EditItemForm item={{ id: it.id, name: it.name, brand: it.brand, size: it.size, condition: it.condition, description: it.description, image: it.image, startPrice: it.startPrice, minIncrement: it.minIncrement, bidCount: it.bidCount }} />
                      </details>
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

          <section className={`${cardCls} p-5 sm:p-6`}>
            <h2 className="mb-1 font-display text-2xl tracking-wide">4. Recordatorio de cierre</h2>
            <p className="mb-4 text-sm text-muted">Les llega “hoy cierra la subasta” con la hora de cierre ({formatWhen(auction.endsAt)}) y el enlace para entrar.</p>
            <ReminderForm auctionId={auction.id} pendingCount={unreminded} />
          </section>
        </>
      )}
    </div>
  );
}
