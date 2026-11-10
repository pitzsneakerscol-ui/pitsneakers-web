import "server-only";
import { getDb } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { botConfig } from "@/config/whatsapp-bot";
import { getAllGroups } from "@/lib/products";
import { freeShippingLive } from "@/lib/sale";
import { groupPriceRange, groupSizes } from "@/lib/grouping";
import { getOrderByRef } from "@/lib/catalog-orders";
import { rateLimitHit } from "@/lib/auth";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { markRead, sendText } from "@/lib/wa-cloud";
import { decide, orderStatusText, type BotSite, type BotState, type CatalogEntry, type Decision } from "@/lib/wa-bot-logic";

/* ---------- Catálogo en memoria (se refresca cada minuto) ---------- */

let catalogCache: { at: number; entries: CatalogEntry[] } | null = null;

async function catalogEntries(): Promise<CatalogEntry[]> {
  if (catalogCache && Date.now() - catalogCache.at < 60_000) return catalogCache.entries;
  const groups = await getAllGroups();
  const entries = groups.map((g) => {
    const r = groupPriceRange(g);
    return { slug: g.groupSlug, name: g.name, brand: g.brand, colorway: g.colorway, sizes: groupSizes(g), minPrice: r.min, maxPrice: r.max };
  });
  catalogCache = { at: Date.now(), entries };
  return entries;
}

const site = (): BotSite => ({ url: siteConfig.siteUrl.replace(/\/$/, ""), shipFee: freeShippingLive() ? 0 : siteConfig.delivery.fee, city: siteConfig.city });

/* ---------- Contactos y mensajes ---------- */

export interface WaContact {
  phone: string;
  name: string;
  createdAt: number;
  lastInAt: number;
  lastOutAt: number;
  optOut: boolean;
  humanUntil: number;
  needsHuman: boolean;
  handoffNote: string;
  state: BotState;
  stateData: string;
  misses: number;
}

const toContact = (r: Record<string, unknown>): WaContact => ({
  phone: String(r.phone),
  name: String(r.name),
  createdAt: Number(r.created_at),
  lastInAt: Number(r.last_in_at),
  lastOutAt: Number(r.last_out_at),
  optOut: Number(r.opt_out) === 1,
  humanUntil: Number(r.human_until),
  needsHuman: Number(r.needs_human) === 1,
  handoffNote: String(r.handoff_note),
  state: (["sell_model", "sell_confirm"].includes(String(r.state)) ? String(r.state) : "") as BotState,
  stateData: String(r.state_data),
  misses: Number(r.misses),
});

export async function getWaContact(phone: string): Promise<WaContact | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM wa_contacts WHERE phone = ?", args: [phone] });
  return r.rows[0] ? toContact(r.rows[0] as unknown as Record<string, unknown>) : null;
}

async function touchContact(phone: string, name: string): Promise<WaContact> {
  const db = await getDb();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO wa_contacts (phone, name, created_at, last_in_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET last_in_at = excluded.last_in_at, name = CASE WHEN wa_contacts.name = '' THEN excluded.name ELSE wa_contacts.name END`,
    args: [phone, name.slice(0, 80), now, now],
  });
  return (await getWaContact(phone)) as WaContact;
}

/** Guarda un mensaje. Devuelve false si ya estaba guardado (Meta reenvía avisos): así nunca se contesta dos veces lo mismo. */
export async function saveMessage(m: { phone: string; dir: "in" | "out"; kind?: string; body: string; mediaId?: string; waId?: string; sender: string }): Promise<boolean> {
  const db = await getDb();
  const r = await db.execute({
    sql: "INSERT OR IGNORE INTO wa_messages (phone, dir, kind, body, media_id, wa_id, sender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [m.phone, m.dir, m.kind ?? "text", m.body.slice(0, 4000), m.mediaId ?? "", m.waId ?? null, m.sender, Date.now()],
  });
  return r.rowsAffected > 0;
}

/** Envía un texto y lo deja anotado en la conversación. */
export async function replyText(phone: string, body: string, sender: "bot" | "equipo"): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await sendText(phone, body);
  if (!r.ok) {
    console.error("WhatsApp: no se pudo enviar", phone.slice(-4), r.error);
    return { ok: false, error: r.error };
  }
  await saveMessage({ phone, dir: "out", body, waId: r.id, sender });
  const db = await getDb();
  await db.execute({ sql: "UPDATE wa_contacts SET last_out_at = ? WHERE phone = ?", args: [Date.now(), phone] });
  return { ok: true };
}

/* ---------- Pedidos ---------- */

const digits = (s: string) => s.replace(/\D/g, "");

async function ordersFor(phone: string, ref: string | null): Promise<string | null> {
  if (ref) {
    const o = await getOrderByRef(ref);
    if (!o) return `No encontré el pedido ${ref}. Revisa que esté bien escrito (empieza con PITS-) o escribe *asesor*.`;
    return orderStatusText(o, site()).text;
  }
  const db = await getDb();
  const last10 = digits(phone).slice(-10);
  const rows = await db.execute({
    sql: "SELECT reference, buyer_phone FROM catalog_orders WHERE created_at > ? ORDER BY id DESC LIMIT 600",
    args: [Date.now() - 180 * 86_400_000],
  });
  const mine = rows.rows.filter((r) => digits(String(r.buyer_phone)).slice(-10) === last10).slice(0, 3).map((r) => String(r.reference));
  if (mine.length === 0) return "No encuentro pedidos con este número. Escríbeme tu número de pedido (empieza con *PITS-*) o escribe *asesor*.";
  const parts: string[] = [];
  for (const ref of mine) {
    const o = await getOrderByRef(ref);
    if (o) parts.push(orderStatusText(o, site()).text);
  }
  return parts.join("\n\n");
}

/* ---------- Aviso al equipo ---------- */

export const adminInboxUrl = (phone?: string) => `${siteConfig.siteUrl.replace(/\/$/, "")}/admin/whatsapp${phone ? `?tel=${phone}` : ""}`;

async function notifyTeam(c: WaContact, reason: string): Promise<void> {
  if (!isEmailConfigured()) return;
  await sendEmail({
    to: siteConfig.contactEmail,
    subject: `WhatsApp: ${c.name || c.phone} necesita una persona`,
    body: `**${c.name || "Sin nombre"}** (+${c.phone}) necesita que alguien del equipo le escriba.\n\n> ${reason}\n\n[boton: Abrir la conversación | ${adminInboxUrl(c.phone)}]`,
  }).catch(() => null);
}

/* ---------- Avisos que manda Meta ---------- */

interface WaMessage {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  image?: { id?: string; caption?: string };
  document?: { id?: string; caption?: string; filename?: string };
  video?: { id?: string; caption?: string };
  audio?: { id?: string };
  location?: unknown;
}
interface WaValue {
  messages?: WaMessage[];
  contacts?: { wa_id: string; profile?: { name?: string } }[];
}
export interface WaPayload {
  entry?: { changes?: { field?: string; value?: WaValue }[] }[];
}

export async function handleWebhook(payload: WaPayload): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const ch of entry.changes ?? []) {
      if (ch.field !== "messages" || !ch.value?.messages) continue;
      const names = new Map((ch.value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? ""]));
      for (const msg of ch.value.messages) {
        try {
          await handleMessage(msg, names.get(msg.from) ?? "");
        } catch (e) {
          console.error("WhatsApp: error al atender un mensaje", e instanceof Error ? e.message : e);
        }
      }
    }
  }
}

function describe(msg: WaMessage): { kind: string; text: string; mediaId: string } {
  switch (msg.type) {
    case "text":
      return { kind: "text", text: msg.text?.body ?? "", mediaId: "" };
    case "button":
      return { kind: "text", text: msg.button?.text ?? "", mediaId: "" };
    case "interactive":
      return { kind: "text", text: msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? "", mediaId: "" };
    case "image":
      return { kind: "image", text: msg.image?.caption ?? "", mediaId: msg.image?.id ?? "" };
    case "document":
      return { kind: "document", text: msg.document?.caption ?? msg.document?.filename ?? "", mediaId: msg.document?.id ?? "" };
    case "video":
      return { kind: "video", text: msg.video?.caption ?? "", mediaId: msg.video?.id ?? "" };
    default:
      return { kind: msg.type, text: "", mediaId: msg.type === "audio" ? (msg.audio?.id ?? "") : "" };
  }
}

async function handleMessage(msg: WaMessage, profileName: string): Promise<void> {
  const phone = String(msg.from).replace(/\D/g, "");
  if (!phone || phone.length < 8) return;
  const { kind, text, mediaId } = describe(msg);

  const fresh = await saveMessage({ phone, dir: "in", kind, body: text, mediaId, waId: msg.id, sender: "cliente" });
  if (!fresh) return; // Meta lo reenvió: ya lo atendimos
  void markRead(msg.id);

  const c = await touchContact(phone, profileName);
  const db = await getDb();
  const now = Date.now();

  // Tope contra abusos o bucles: 40 mensajes por hora por número.
  if (!(await rateLimitHit(`wa:${phone}`, 40, 3_600_000))) return;

  // Si una persona está atendiendo, el bot se queda callado (solo se marca que el cliente escribió).
  if (c.humanUntil > now) {
    await db.execute({ sql: "UPDATE wa_contacts SET needs_human = 1 WHERE phone = ?", args: [phone] });
    return;
  }

  const textual = kind === "text" && text.trim() !== "";
  const wantsBack = textual && /^(alta|reanudar|activar)\b/i.test(text.trim());
  if (c.optOut && !wantsBack) return; // pidió no recibir más: no se le responde

  // Fotos, audios y demás archivos.
  if (!textual) {
    const selling = c.state === "sell_model" || c.state === "sell_confirm";
    const reply = selling
      ? "¡Recibí tu archivo! ✅ Le aviso a un asesor para que lo revise y te escriba por aquí."
      : "Por ahora solo leo mensajes de texto 🙏 Escríbeme lo que necesitas o escribe *asesor* para hablar con una persona.";
    await replyText(phone, reply, "bot");
    if (selling) await startHandoff(c, `Mandó ${kind === "image" ? "una foto" : "un archivo"} al publicar un par: ${c.stateData || "(sin descripción)"}`);
    return;
  }

  const catalog = await catalogEntries();
  const decision: Decision = decide(text, {
    state: c.state,
    stateData: c.stateData,
    name: c.name || profileName,
    catalog,
    texts: botConfig,
    site: site(),
    misses: c.misses,
  });

  let replies = decision.replies;
  let handoff = decision.handoff;
  if (decision.lookupOrder) {
    const t = await ordersFor(phone, decision.lookupOrder.ref);
    replies = [t ?? "No pude consultar el pedido. Escribe *asesor* y te ayudamos."];
    if (t && /novedad en el envío/.test(t)) handoff = "Su pedido tiene una incidencia de envío";
  }

  // Si no entendió tres veces seguidas, mejor una persona.
  let misses = decision.misunderstood ? c.misses + 1 : 0;
  if (decision.misunderstood && misses >= 3) {
    replies = [...replies, "Veo que no estoy logrando ayudarte 😅 Le aviso a una persona del equipo para que te escriba por aquí."];
    handoff = "El bot no lo entendió 3 veces seguidas";
    misses = 0;
  }

  for (const r of replies) await replyText(phone, r, "bot");

  await db.execute({
    sql: "UPDATE wa_contacts SET state = ?, state_data = ?, misses = ?, opt_out = CASE WHEN ? = 1 THEN 1 WHEN ? = 1 THEN 0 ELSE opt_out END WHERE phone = ?",
    args: [decision.state, decision.stateData ?? (decision.state ? c.stateData : ""), misses, decision.optOut ? 1 : 0, decision.optIn ? 1 : 0, phone],
  });
  if (handoff) await startHandoff(c, handoff);
}

/** Pasa la conversación a una persona: el bot calla unas horas y el equipo recibe un correo con el enlace. */
export async function startHandoff(c: WaContact, reason: string): Promise<void> {
  const db = await getDb();
  const until = Date.now() + botConfig.humanHours * 3_600_000;
  const already = c.needsHuman && c.humanUntil > Date.now();
  await db.execute({ sql: "UPDATE wa_contacts SET human_until = ?, needs_human = 1, handoff_note = ? WHERE phone = ?", args: [until, reason.slice(0, 500), c.phone] });
  if (!already) await notifyTeam(c, reason);
}

/** El equipo termina de atender: el bot vuelve a contestar. */
export async function returnToBot(phone: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE wa_contacts SET human_until = 0, needs_human = 0, handoff_note = '', state = '', state_data = '' WHERE phone = ?", args: [phone] });
}

/* ---------- Lectura para el admin ---------- */

export interface Conversation extends WaContact {
  lastBody: string;
  lastDir: "in" | "out";
  lastAt: number;
}

export async function listConversations(limit = 60): Promise<Conversation[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT c.*, m.body AS last_body, m.dir AS last_dir, m.kind AS last_kind, m.created_at AS last_at
          FROM wa_contacts c
          JOIN wa_messages m ON m.id = (SELECT id FROM wa_messages WHERE phone = c.phone ORDER BY id DESC LIMIT 1)
          ORDER BY c.needs_human DESC, m.created_at DESC LIMIT ?`,
    args: [limit],
  });
  return r.rows.map((x) => ({
    ...toContact(x as unknown as Record<string, unknown>),
    lastBody: String(x.last_body) || (String(x.last_kind) !== "text" ? `[${String(x.last_kind)}]` : ""),
    lastDir: String(x.last_dir) === "out" ? "out" : "in",
    lastAt: Number(x.last_at),
  }));
}

export interface ChatMessage {
  id: number;
  dir: "in" | "out";
  kind: string;
  body: string;
  mediaId: string;
  sender: string;
  at: number;
}

export async function listMessages(phone: string, limit = 200): Promise<ChatMessage[]> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM (SELECT * FROM wa_messages WHERE phone = ? ORDER BY id DESC LIMIT ?) ORDER BY id", args: [phone, limit] });
  return r.rows.map((x) => ({
    id: Number(x.id),
    dir: String(x.dir) === "out" ? "out" : "in",
    kind: String(x.kind),
    body: String(x.body),
    mediaId: String(x.media_id),
    sender: String(x.sender),
    at: Number(x.created_at),
  }));
}

/** WhatsApp solo deja escribir texto libre dentro de las 24 horas siguientes al último mensaje del cliente. */
export function isWindowOpen(messages: ChatMessage[]): boolean {
  const lastIn = [...messages].reverse().find((m) => m.dir === "in")?.at ?? 0;
  return lastIn > Date.now() - 24 * 3_600_000;
}

export async function waCounts(): Promise<{ waiting: number; contacts: number; optOut: number }> {
  const db = await getDb();
  const r = await db.execute("SELECT COUNT(*) AS n, COALESCE(SUM(needs_human), 0) AS w, COALESCE(SUM(opt_out), 0) AS o FROM wa_contacts");
  return { waiting: Number(r.rows[0].w), contacts: Number(r.rows[0].n), optOut: Number(r.rows[0].o) };
}
