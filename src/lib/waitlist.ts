import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { prelaunch } from "@/config/prelaunch";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export interface WaitlistEntry {
  id: number;
  email: string;
  code: string;
  welcomed: boolean;
  createdAt: number;
}

// Sin 0/O/1/I para que el código se pueda dictar sin confundirse.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () => "PITS" + Array.from(randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join("");

/** Inscribe el correo (una sola vez). Si ya estaba, devuelve su registro con `isNew: false`. */
export async function joinWaitlist(email: string): Promise<{ code: string; isNew: boolean }> {
  const db = await getDb();
  const found = await db.execute({ sql: "SELECT code FROM waitlist WHERE email = ?", args: [email] });
  if (found.rows[0]) return { code: String(found.rows[0].code), isNew: false };
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const r = await db.execute({ sql: "INSERT OR IGNORE INTO waitlist (email, code, created_at) VALUES (?, ?, ?)", args: [email, code, Date.now()] });
    if (r.rowsAffected > 0) return { code, isNew: true };
    // Pudo ser un código repetido o que el correo se inscribió justo ahora.
    const again = await db.execute({ sql: "SELECT code FROM waitlist WHERE email = ?", args: [email] });
    if (again.rows[0]) return { code: String(again.rows[0].code), isNew: false };
  }
  throw new Error("No se pudo generar un código único.");
}

export async function markWelcomed(email: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE waitlist SET welcomed = 1 WHERE email = ?", args: [email] });
}

export async function listWaitlist(): Promise<WaitlistEntry[]> {
  const db = await getDb();
  const r = await db.execute("SELECT id, email, code, welcomed, created_at FROM waitlist ORDER BY created_at DESC");
  return r.rows.map((x) => ({ id: Number(x.id), email: String(x.email), code: String(x.code), welcomed: Number(x.welcomed) === 1, createdAt: Number(x.created_at) }));
}

export function waitlistToCsv(rows: WaitlistEntry[]): string {
  const lines = ["CORREO,CODIGO,FECHA"];
  for (const r of rows) lines.push([r.email, r.code, new Date(r.createdAt).toISOString()].join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Correo de bienvenida a la lista de espera. */
export function waitlistEmail(): { subject: string; body: string } {
  const wa = buildGeneralWhatsAppLink("Hola! Ya estoy en la lista de Pitsneakers");
  const subject = "Ya estás en la lista de Pitsneakers";
  const body = [
    "# Ya estás ==en la lista==",
    "",
    `Gracias por unirte a ${siteConfig.name}. Estamos preparando el lanzamiento de la nueva página y tú vas a entrar primero.`,
    "",
    ...prelaunch.perks.map((p) => `- ${p}`),
    "",
    `[boton: Escríbenos por WhatsApp | ${wa}]`,
    "",
    "Te avisamos por aquí apenas abramos.",
    "",
    "**Equipo Pitsneakers**",
  ].join("\n");
  return { subject, body };
}
