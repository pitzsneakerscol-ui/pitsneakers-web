"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { isEmail } from "@/lib/reseller-shared";
import { createBidderSession, destroyBidderSession, getBidder, getPublishedAuction, getWaitlistEmail, listAuctionItems, placeBid, verifyPass } from "@/lib/auction";
import { minNextBid, type LiveItem } from "@/lib/auction-shared";
import { leadingEmail, outbidEmail } from "@/lib/auction-emails";

export type PassState = { error?: string } | undefined;
export type BidState = { ok: boolean; error?: string; message?: string; item?: LiveItem } | undefined;

const HOUR = 60 * 60 * 1000;

/** Entrar a la subasta con el correo y el pase de la lista de espera. */
export async function enterAuction(_prev: PassState, fd: FormData): Promise<PassState> {
  let dest = "/subasta";
  try {
    if (!isDbConfigured()) return { error: "La subasta aún no está disponible." };
    const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 120);
    const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 20);
    if (!isEmail(email) || code.length < 6) return { error: "Escribe el correo con el que te inscribiste y tu pase." };
    const ip = await clientIp();
    if (!(await rateLimitHit(`pase:ip:${ip}`, 15, HOUR)) || !(await rateLimitHit(`pase:${email}`, 10, HOUR))) {
      return { error: "Demasiados intentos. Espera un rato e intenta de nuevo." };
    }
    const bidder = await verifyPass(email, code);
    if (!bidder) return { error: "No encontramos ese correo con ese pase. Revisa el correo de bienvenida." };
    await createBidderSession(bidder.id);
    dest = String(fd.get("next") ?? "") === "/trivia" ? "/trivia" : "/subasta";
  } catch (e) {
    unstable_rethrow(e);
    console.error("[subasta] entrar:", e);
    return { error: "No pudimos validar tu pase. Intenta de nuevo en unos minutos." };
  }
  redirect(dest);
}

export async function leaveAuction(): Promise<void> {
  await destroyBidderSession();
  redirect("/subasta");
}

/** Pujar por un par. Te llega un correo de que vas ganando y, si superas a alguien, a esa persona le llega que la superaron. */
export async function bid(itemId: number, amount: number): Promise<BidState> {
  try {
    if (!isDbConfigured()) return { ok: false, error: "La subasta aún no está disponible." };
    const bidder = await getBidder();
    if (!bidder) return { ok: false, error: "Tu sesión venció. Entra de nuevo con tu pase." };
    if (!(await rateLimitHit(`bid:${bidder.id}`, 40, 60 * 1000))) return { ok: false, error: "Vas muy rápido. Espera unos segundos." };

    const res = await placeBid(Number(itemId), bidder.id, Math.round(Number(amount)));
    if (!res.ok) return { ok: false, error: res.error };

    const auction = await getPublishedAuction();
    const items = auction ? await listAuctionItems(auction.id, bidder.id) : [];
    const it = items.find((x) => x.id === Number(itemId));

    // Dos correos: al que acaba de pujar ("vas ganando") y al que iba ganando ("te superaron").
    // Salen después de responder y uno tras otro (Resend acepta ~2 por segundo).
    if (it && isEmailConfigured()) {
      const prevId = res.prevLeaderId;
      const itemName = res.itemName;
      after(async () => {
        const mine = await getWaitlistEmail(bidder.id);
        if (mine) {
          const { subject, body } = leadingEmail({ item: itemName, amount: it.currentBid, endsAt: it.endsAt });
          await sendEmail({ to: mine, subject, body }).catch(() => undefined);
        }
        if (prevId !== null && prevId !== bidder.id) {
          const to = await getWaitlistEmail(prevId);
          if (to) {
            await new Promise((r) => setTimeout(r, 600));
            const { subject, body } = outbidEmail({ item: itemName, amount: it.currentBid, minNext: minNextBid(it) });
            await sendEmail({ to, subject, body }).catch(() => undefined);
          }
        }
      });
    }
    return {
      ok: true,
      message: "¡Vas ganando este par!",
      item: it && { id: it.id, currentBid: it.currentBid, bidCount: it.bidCount, endsAt: it.endsAt, leader: it.leader, isLeader: it.isLeader },
    };
  } catch (e) {
    unstable_rethrow(e);
    console.error("[subasta] pujar:", e);
    return { ok: false, error: "No pudimos registrar tu puja. Intenta de nuevo." };
  }
}
