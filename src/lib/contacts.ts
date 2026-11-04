import "server-only";
import { getDb } from "@/lib/db";
import { isEmail } from "@/lib/reseller-shared";

export interface Contact {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  notes: string;
  source: string;
  unsubscribed: boolean;
  createdAt: number;
}

const toContact = (r: Record<string, unknown>): Contact => ({
  id: Number(r.id),
  email: String(r.email),
  name: String(r.name),
  phone: String(r.phone),
  city: String(r.city),
  notes: String(r.notes),
  source: String(r.source),
  unsubscribed: Number(r.unsubscribed) === 1,
  createdAt: Number(r.created_at),
});

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 1_500_000;

/* ---------- CSV ---------- */

/** Lector de CSV con comillas (campos con comas, comillas dobles y saltos de línea). Acepta coma o punto y coma como separador. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const norm = (h: string) => h.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "");
const ALIASES: Record<string, string[]> = {
  email: ["email", "correo", "correoelectronico", "mail", "emailaddress"],
  name: ["nombre", "name", "nombrecompleto", "fullname"],
  first: ["firstname", "primernombre"],
  last: ["lastname", "apellido", "apellidos"],
  phone: ["telefono", "celular", "whatsapp", "phone", "movil", "tel"],
  city: ["ciudad", "city"],
  notes: ["notas", "notes", "nota", "comentarios"],
  unsubscribed: ["unsubscribed", "baja", "dadodebaja", "desuscrito"],
};

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Celular colombiano → solo dígitos con 57 al inicio; "" si no parece un celular (se acepta también 10 dígitos que empiecen en 3). */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0057")) d = d.slice(4);
  if (d.startsWith("57") && d.length === 12) d = d.slice(2);
  return d.length === 10 && d.startsWith("3") ? `57${d}` : "";
}

export interface ParsedContact {
  email: string;
  name: string;
  phone: string;
  city: string;
  notes: string;
  unsubscribed: boolean;
}

/** Convierte el CSV en contactos. Devuelve también las filas que se descartaron y por qué. */
export function contactsFromCsv(text: string): { contacts: ParsedContact[]; skipped: { line: number; reason: string }[]; error?: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { contacts: [], skipped: [], error: "El archivo no tiene filas. La primera línea debe ser el encabezado (email, nombre, telefono…)." };
  const head = rows[0].map(norm);
  const col = (key: string) => head.findIndex((h) => ALIASES[key].includes(h));
  const idx = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, col(k)])) as Record<string, number>;
  if (idx.email < 0) return { contacts: [], skipped: [], error: "No encontré la columna del correo. El encabezado debe incluir “email” o “correo”." };

  const seen = new Map<string, ParsedContact>();
  const skipped: { line: number; reason: string }[] = [];
  rows.slice(1).forEach((r, i) => {
    const get = (k: string) => (idx[k] >= 0 ? r[idx[k]] ?? "" : "");
    const email = clean(get("email"), 120).toLowerCase().replace(/\s/g, "");
    if (!isEmail(email)) {
      skipped.push({ line: i + 2, reason: email ? "correo no válido" : "sin correo" });
      return;
    }
    const name = clean(get("name") || `${get("first")} ${get("last")}`, 80);
    const unsub = /^(true|si|sí|1|yes)$/i.test(clean(get("unsubscribed"), 10));
    const c: ParsedContact = { email, name, phone: normalizePhone(get("phone")), city: clean(get("city"), 60), notes: clean(get("notes"), 500), unsubscribed: unsub };
    const prev = seen.get(email);
    seen.set(email, prev ? { ...c, name: c.name || prev.name, phone: c.phone || prev.phone, city: c.city || prev.city, notes: c.notes || prev.notes, unsubscribed: c.unsubscribed || prev.unsubscribed } : c);
  });
  return { contacts: [...seen.values()], skipped };
}

/* ---------- Base de datos ---------- */

export interface ImportResult {
  added: number;
  updated: number;
  unsubscribed: number;
}

/**
 * Carga los contactos. Si el correo ya existe, solo se completan los datos que le faltaban (no se pisan los que ya tiene)
 * y nunca se le quita una baja: quien pidió no recibir correos sigue sin recibirlos aunque vuelva a aparecer en un archivo.
 */
export async function importContacts(contacts: ParsedContact[], source: string): Promise<ImportResult> {
  const db = await getDb();
  const existing = await db.execute("SELECT email FROM marketing_contacts");
  const have = new Set(existing.rows.map((r) => String(r.email).toLowerCase()));
  const now = Date.now();
  let added = 0;
  let updated = 0;
  let unsubscribed = 0;

  for (let i = 0; i < contacts.length; i += 200) {
    const chunk = contacts.slice(i, i + 200);
    await db.batch(
      chunk.map((c) => {
        if (c.unsubscribed) unsubscribed++;
        if (have.has(c.email)) {
          updated++;
          return {
            sql: `UPDATE marketing_contacts SET
                    name = CASE WHEN name = '' THEN ? ELSE name END,
                    phone = CASE WHEN phone = '' THEN ? ELSE phone END,
                    city = CASE WHEN city = '' THEN ? ELSE city END,
                    notes = CASE WHEN notes = '' THEN ? ELSE notes END,
                    unsubscribed = CASE WHEN ? = 1 THEN 1 ELSE unsubscribed END
                  WHERE email = ?`,
            args: [c.name, c.phone, c.city, c.notes, c.unsubscribed ? 1 : 0, c.email],
          };
        }
        added++;
        return {
          sql: "INSERT OR IGNORE INTO marketing_contacts (email, name, phone, city, notes, source, unsubscribed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [c.email, c.name, c.phone, c.city, c.notes, source, c.unsubscribed ? 1 : 0, now],
        };
      }),
      "write",
    );
  }
  return { added, updated, unsubscribed };
}

export const PAGE_SIZE = 40;

export async function contactStats(): Promise<{ total: number; active: number; unsubscribed: number; withPhone: number }> {
  const db = await getDb();
  const r = await db.execute(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN unsubscribed = 0 THEN 1 ELSE 0 END), 0) AS active,
            COALESCE(SUM(unsubscribed), 0) AS unsub,
            COALESCE(SUM(CASE WHEN phone != '' THEN 1 ELSE 0 END), 0) AS phones
     FROM marketing_contacts`,
  );
  const x = r.rows[0];
  return { total: Number(x.total), active: Number(x.active), unsubscribed: Number(x.unsub), withPhone: Number(x.phones) };
}

export async function listContacts(opts: { q: string; filter: "todos" | "activos" | "bajas"; page: number }): Promise<{ rows: Contact[]; total: number }> {
  const db = await getDb();
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.filter === "activos") where.push("unsubscribed = 0");
  if (opts.filter === "bajas") where.push("unsubscribed = 1");
  if (opts.q) {
    where.push("(email LIKE ? OR name LIKE ? OR phone LIKE ? OR city LIKE ?)");
    const like = `%${opts.q.replace(/[%_]/g, "")}%`;
    args.push(like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = Number((await db.execute({ sql: `SELECT COUNT(*) AS n FROM marketing_contacts ${clause}`, args })).rows[0].n);
  const rows = await db.execute({
    sql: `SELECT * FROM marketing_contacts ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...args, PAGE_SIZE, (Math.max(1, opts.page) - 1) * PAGE_SIZE],
  });
  return { rows: rows.rows.map((r) => toContact(r as unknown as Record<string, unknown>)), total };
}

export async function setContactUnsubscribed(id: number, unsub: boolean): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE marketing_contacts SET unsubscribed = ? WHERE id = ?", args: [unsub ? 1 : 0, id] });
}

export async function deleteContact(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM marketing_contacts WHERE id = ?", args: [id] });
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** CSV para importar en Resend (Audiences → Add contacts → Import CSV). Solo salen los contactos que no se dieron de baja. */
export async function contactsToResendCsv(): Promise<{ csv: string; count: number }> {
  const db = await getDb();
  const r = await db.execute("SELECT email, name FROM marketing_contacts WHERE unsubscribed = 0 ORDER BY id");
  const lines = ["email,first_name,last_name,unsubscribed"];
  for (const row of r.rows) {
    const [first = "", ...rest] = String(row.name).split(" ");
    lines.push([csvCell(String(row.email)), csvCell(first), csvCell(rest.join(" ")), "false"].join(","));
  }
  return { csv: "﻿" + lines.join("\r\n") + "\r\n", count: r.rows.length };
}
