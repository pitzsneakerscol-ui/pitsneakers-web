import "server-only";
import { getDb } from "@/lib/db";
import { botConfig } from "@/config/whatsapp-bot";
import { normalizePhone } from "@/lib/contacts";
import { isWaConfigured, sendTemplate } from "@/lib/wa-cloud";
import { saveMessage } from "@/lib/wa-bot";

/**
 * Reactivación: escribirle primero a quien dejó de comprar o de publicar. Meta solo permite hacerlo con una PLANTILLA aprobada,
 * y WhatsApp exige que la persona haya tenido trato con nosotros y pueda pedir la baja (el bot atiende BAJA y no vuelve a escribirle).
 * Por eso solo salen dos listas, ambas de gente que ya compró o ya es vendedora de Pitsneakers.
 */

export type Segment = "compradores" | "vendedores";
export const SEGMENTS: Record<Segment, { label: string; help: string }> = {
  compradores: { label: "Compradores que dejaron de comprar", help: "Compraron en la página (pedido pagado) y llevan más de N días sin volver a comprar." },
  vendedores: { label: "Vendedores que dejaron de publicar", help: "Tienen cuenta de vendedor con su WhatsApp y llevan más de N días sin cargar un par." },
};
export const isSegment = (v: string): v is Segment => v === "compradores" || v === "vendedores";

export interface Candidate {
  phone: string;
  name: string;
  /** última compra o último par cargado (ms); 0 = nunca */
  lastAt: number;
}

const DAY = 86_400_000;

async function candidates(segment: Segment, days: number): Promise<{ list: Candidate[]; noPhone: number }> {
  const db = await getDb();
  const cutoff = Date.now() - days * DAY;
  const byPhone = new Map<string, Candidate>();
  let noPhone = 0;

  if (segment === "compradores") {
    const r = await db.execute("SELECT buyer_phone AS phone, buyer_name AS name, COALESCE(paid_at, created_at) AS at FROM catalog_orders WHERE status = 'pagado'");
    for (const x of r.rows) {
      const phone = normalizePhone(String(x.phone));
      if (!phone) {
        noPhone++;
        continue;
      }
      const at = Number(x.at);
      const prev = byPhone.get(phone);
      if (!prev || at > prev.lastAt) byPhone.set(phone, { phone, name: String(x.name), lastAt: at });
    }
  } else {
    const r = await db.execute(
      `SELECT u.whatsapp AS phone, u.display_name AS name, u.username AS username,
              COALESCE((SELECT MAX(created_at) FROM items WHERE user_id = u.id), u.created_at) AS at
       FROM users u WHERE u.whatsapp != '' AND u.role != 'admin'`,
    ).catch(async () =>
      db.execute(
        `SELECT u.whatsapp AS phone, u.display_name AS name, u.username AS username,
                COALESCE((SELECT MAX(created_at) FROM items WHERE user_id = u.id), u.created_at) AS at
         FROM users u WHERE u.whatsapp != ''`,
      ),
    );
    for (const x of r.rows) {
      const phone = normalizePhone(String(x.phone));
      if (!phone) {
        noPhone++;
        continue;
      }
      byPhone.set(phone, { phone, name: String(x.name) || String(x.username), lastAt: Number(x.at) });
    }
  }
  const list = [...byPhone.values()].filter((c) => c.lastAt < cutoff).sort((a, b) => b.lastAt - a.lastAt);
  return { list, noPhone };
}

export interface Preview {
  total: number;
  eligible: Candidate[];
  optOut: number;
  alreadySent: number;
  active: number;
  noPhone: number;
}

export async function previewBroadcast(segment: Segment, days: number, campaign: string): Promise<Preview> {
  const db = await getDb();
  const { list, noPhone } = await candidates(segment, days);
  const now = Date.now();
  const contacts = await db.execute("SELECT phone, opt_out, last_in_at FROM wa_contacts");
  const optOut = new Set(contacts.rows.filter((r) => Number(r.opt_out) === 1).map((r) => String(r.phone)));
  // Si ya nos escribió en estos días, está en conversación: no se le manda una plantilla encima.
  const active = new Set(contacts.rows.filter((r) => Number(r.last_in_at) > now - days * DAY).map((r) => String(r.phone)));
  const sent = await db.execute({ sql: "SELECT phone FROM wa_broadcasts WHERE campaign = ? AND status IN ('enviado', 'enviando')", args: [campaign] });
  const done = new Set(sent.rows.map((r) => String(r.phone)));

  let o = 0;
  let s = 0;
  let a = 0;
  const eligible: Candidate[] = [];
  for (const c of list) {
    if (optOut.has(c.phone)) o++;
    else if (done.has(c.phone)) s++;
    else if (active.has(c.phone)) a++;
    else eligible.push(c);
  }
  return { total: list.length, eligible, optOut: o, alreadySent: s, active: a, noPhone };
}

export interface BroadcastReport {
  attempted: number;
  sent: number;
  failed: number;
  firstError: string;
  stoppedEarly: boolean;
}

const firstName = (n: string) => {
  const w = n.trim().split(/\s+/)[0] ?? "";
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "parcero";
};

/**
 * Envía la plantilla a hasta `limit` personas de la lista. Cada una se "reserva" antes (wa_broadcasts) para que si se
 * pulsa dos veces o se corta la conexión nadie reciba el mismo mensaje dos veces. Si fallan 3 seguidas se detiene.
 */
export async function runBroadcast(segment: Segment, days: number, campaign: string, limit: number): Promise<BroadcastReport> {
  const report: BroadcastReport = { attempted: 0, sent: 0, failed: 0, firstError: "", stoppedEarly: false };
  if (!isWaConfigured()) return { ...report, firstError: "WhatsApp no está configurado." };
  const db = await getDb();
  const { eligible } = await previewBroadcast(segment, days, campaign);
  const template = botConfig.templates[segment];
  let streak = 0;

  for (const c of eligible.slice(0, limit)) {
    const claim = await db.execute({
      sql: `INSERT INTO wa_broadcasts (campaign, phone, status, sent_at) VALUES (?, ?, 'enviando', ?)
            ON CONFLICT(campaign, phone) DO UPDATE SET status = 'enviando', error = '', sent_at = excluded.sent_at WHERE wa_broadcasts.status = 'fallido'`,
      args: [campaign, c.phone, Date.now()],
    });
    if (claim.rowsAffected === 0) continue; // otra ejecución ya lo tomó
    report.attempted++;

    const r = await sendTemplate(c.phone, template, botConfig.templates.language, [firstName(c.name)]);
    if (r.ok) {
      streak = 0;
      report.sent++;
      await db.batch(
        [
          { sql: "UPDATE wa_broadcasts SET status = 'enviado', sent_at = ? WHERE campaign = ? AND phone = ?", args: [Date.now(), campaign, c.phone] },
          { sql: "INSERT OR IGNORE INTO wa_contacts (phone, name, created_at) VALUES (?, ?, ?)", args: [c.phone, c.name.slice(0, 80), Date.now()] },
        ],
        "write",
      );
      await saveMessage({ phone: c.phone, dir: "out", kind: "template", body: `[Plantilla ${template}] campaña ${campaign}`, waId: r.id, sender: "campana" });
    } else {
      streak++;
      report.failed++;
      report.firstError ||= r.error;
      await db.execute({ sql: "UPDATE wa_broadcasts SET status = 'fallido', error = ?, sent_at = ? WHERE campaign = ? AND phone = ?", args: [r.error.slice(0, 200), Date.now(), campaign, c.phone] });
      if (streak >= 3) {
        report.stoppedEarly = true;
        break;
      }
    }
    await new Promise((res) => setTimeout(res, 250));
  }
  return report;
}

export async function broadcastSummaries(): Promise<{ campaign: string; sent: number; failed: number; last: number }[]> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT campaign, SUM(CASE WHEN status = 'enviado' THEN 1 ELSE 0 END) AS sent, SUM(CASE WHEN status = 'fallido' THEN 1 ELSE 0 END) AS failed, MAX(sent_at) AS last
     FROM wa_broadcasts GROUP BY campaign ORDER BY last DESC LIMIT 10`,
  );
  return r.rows.map((x) => ({ campaign: String(x.campaign), sent: Number(x.sent), failed: Number(x.failed), last: Number(x.last) }));
}
