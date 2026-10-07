"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { siteConfig } from "@/config/site";
import { getDb } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { isEmail, isValidDate, todayBogota, type ActionState } from "@/lib/reseller-shared";
import { PAYMENT_METHODS } from "@/lib/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { DEFAULT_TEMPLATES, missingVars, renderTemplate, type Vars } from "@/lib/email-templates";
import { formatPrice } from "@/lib/format";

const text = (fd: FormData, key: string, max: number): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

const int = (fd: FormData, key: string): number => {
  const v = Number(fd.get(key));
  return Number.isInteger(v) && v > 0 ? v : 0;
};

function money(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const digits = v.replace(/[^\d]/g, "");
  if (digits === "") return null;
  return Math.min(Number(digits), 1_000_000_000);
}

const refresh = () => revalidatePath("/admin", "layout");

/* ---------- Revendedores ---------- */

export async function setSuspended(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = int(fd, "id");
  const suspend = fd.get("suspend") === "1";
  if (!id) return;
  const db = await getDb();
  await db.execute({
    sql: "UPDATE users SET suspended = ? WHERE id = ? AND role != 'admin'",
    args: [suspend ? 1 : 0, id],
  });
  if (suspend) await db.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [id] });
  refresh();
}

export async function resetPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = int(fd, "id");
  if (!id) return { error: "Revendedor inválido." };
  // Sin caracteres ambiguos (0/O, 1/l/I) para dictarla fácil por WhatsApp.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  const temp = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const db = await getDb();
  const res = await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ? AND role != 'admin'",
    args: [await hashPassword(temp), id],
  });
  if (res.rowsAffected === 0) return { error: "No se encontró el revendedor." };
  await db.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [id] });
  const who = await db.execute({ sql: "SELECT username FROM users WHERE id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM rate_limits WHERE key = ?", args: [`loginfail:${String(who.rows[0].username)}`] });
  return {
    ok: true,
    message: `Contraseña temporal: ${temp} — cópiala y envíala; solo se muestra ahora. Pídele que la cambie en Cuenta.`,
  };
}

/* ---------- Compradores ---------- */

export async function saveCustomer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = int(fd, "id");
  const name = text(fd, "name", 80);
  const email = text(fd, "email", 120).toLowerCase();
  const whatsapp = text(fd, "whatsapp", 20).replace(/[^\d]/g, "");
  const notes = text(fd, "notes", 500);
  if (!name) return { error: "Escribe el nombre del comprador." };
  if (email && !isEmail(email)) return { error: "El correo no parece válido." };
  if (whatsapp && (whatsapp.length < 7 || whatsapp.length > 15))
    return { error: "El número de WhatsApp no parece válido." };
  const db = await getDb();
  if (id) {
    await db.execute({
      sql: "UPDATE customers SET name = ?, email = ?, whatsapp = ?, notes = ? WHERE id = ?",
      args: [name, email, whatsapp, notes, id],
    });
  } else {
    await db.execute({
      sql: "INSERT INTO customers (name, email, whatsapp, notes, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [name, email, whatsapp, notes, Date.now()],
    });
  }
  refresh();
  return { ok: true, message: id ? "Comprador actualizado." : "Comprador agregado." };
}

export async function deleteCustomer(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = int(fd, "id");
  if (!id) return;
  const db = await getDb();
  const open = await db.execute({
    sql: "SELECT COUNT(*) AS c FROM payments WHERE party_type = 'customer' AND party_id = ? AND status = 'pendiente'",
    args: [id],
  });
  if (Number(open.rows[0].c) > 0) return; // tiene pagos pendientes: la interfaz lo avisa
  await db.execute({ sql: "DELETE FROM customers WHERE id = ?", args: [id] });
  refresh();
}

/* ---------- Pagos ---------- */

export async function savePayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = int(fd, "id");
  const [rawType, rawId] = text(fd, "party", 20).split(":");
  const partyType = rawType === "r" ? "reseller" : rawType === "c" ? "customer" : "";
  const partyId = Number(rawId);
  const concept = text(fd, "concept", 160);
  const amount = money(fd, "amount");
  const dueDate = text(fd, "dueDate", 10);
  const notes = text(fd, "notes", 500);
  if (!partyType || !Number.isInteger(partyId) || partyId <= 0) return { error: "Elige quién debe el pago." };
  if (!concept) return { error: "Escribe el concepto del pago." };
  if (amount === null || amount <= 0) return { error: "Indica el valor del pago." };
  if (dueDate && !isValidDate(dueDate)) return { error: "La fecha límite no es válida." };

  const db = await getDb();
  const exists = await db.execute({
    sql: partyType === "customer" ? "SELECT 1 FROM customers WHERE id = ?" : "SELECT 1 FROM users WHERE id = ? AND role != 'admin'",
    args: [partyId],
  });
  if (!exists.rows[0]) return { error: "No encontramos a esa persona." };

  if (id) {
    await db.execute({
      sql: "UPDATE payments SET party_type = ?, party_id = ?, concept = ?, amount = ?, due_date = ?, notes = ? WHERE id = ?",
      args: [partyType, partyId, concept, amount, dueDate, notes, id],
    });
  } else {
    await db.execute({
      sql: "INSERT INTO payments (party_type, party_id, concept, amount, due_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [partyType, partyId, concept, amount, dueDate, notes, Date.now()],
    });
  }
  refresh();
  return { ok: true, message: id ? "Pago actualizado." : "Pago registrado." };
}

export async function markPaid(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = int(fd, "id");
  if (!id) return;
  const method = text(fd, "method", 20);
  const paidDate = text(fd, "paidDate", 10);
  const db = await getDb();
  await db.execute({
    sql: "UPDATE payments SET status = 'pagado', paid_date = ?, method = ? WHERE id = ?",
    args: [isValidDate(paidDate) ? paidDate : todayBogota(), PAYMENT_METHODS.includes(method) ? method : "", id],
  });
  refresh();
}

export async function setPaymentStatus(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = int(fd, "id");
  const status = text(fd, "status", 12);
  if (!id || !["pendiente", "cancelado"].includes(status)) return;
  const db = await getDb();
  await db.execute({
    sql: "UPDATE payments SET status = ?, paid_date = '', method = '' WHERE id = ?",
    args: [status, id],
  });
  refresh();
}

export async function deletePayment(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = int(fd, "id");
  if (!id) return;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM payments WHERE id = ?", args: [id] });
  refresh();
}

/* ---------- Plantillas ---------- */

export async function saveTemplate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const key = text(fd, "key", 40);
  const name = text(fd, "name", 80);
  const subject = text(fd, "subject", 160);
  const body = String(fd.get("body") ?? "").slice(0, 5000).trim();
  if (!name || !subject || !body) return { error: "Completa nombre, asunto y mensaje." };
  const db = await getDb();
  if (key) {
    await db.execute({
      sql: "UPDATE email_templates SET name = ?, subject = ?, body = ?, updated_at = ? WHERE key = ?",
      args: [name, subject, body, Date.now(), key],
    });
  } else {
    const newKey = `custom_${randomBytes(4).toString("hex")}`;
    await db.execute({
      sql: "INSERT INTO email_templates (key, name, subject, body, builtin, updated_at) VALUES (?, ?, ?, ?, 0, ?)",
      args: [newKey, name, subject, body, Date.now()],
    });
  }
  refresh();
  return { ok: true, message: "Plantilla guardada." };
}

export async function deleteTemplate(fd: FormData): Promise<void> {
  await requireAdmin();
  const key = text(fd, "key", 40);
  if (!key) return;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM email_templates WHERE key = ? AND builtin = 0", args: [key] });
  refresh();
}

export async function restoreTemplate(fd: FormData): Promise<void> {
  await requireAdmin();
  const key = text(fd, "key", 40);
  const def = DEFAULT_TEMPLATES.find((t) => t.key === key);
  if (!def) return;
  const db = await getDb();
  await db.execute({
    sql: "UPDATE email_templates SET name = ?, subject = ?, body = ?, updated_at = ? WHERE key = ?",
    args: [def.name, def.subject, def.body, Date.now(), key],
  });
  refresh();
}

/* ---------- Envío de correos ---------- */

const MAX_RECIPIENTS = 50;

interface Recipient {
  name: string;
  email: string;
}

export async function sendEmails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!isEmailConfigured())
    return {
      error:
        "El servicio de correo no está configurado. Agrega RESEND_API_KEY y EMAIL_FROM en las variables de entorno (ver README).",
    };

  const subject = text(fd, "subject", 160);
  const body = String(fd.get("body") ?? "").slice(0, 5000).trim();
  const template = text(fd, "template", 40);
  if (!subject || !body) return { error: "Escribe el asunto y el mensaje." };

  const db = await getDb();
  const found = new Map<string, Recipient>();
  const add = (name: string, email: string) => {
    const e = email.trim().toLowerCase();
    if (isEmail(e) && !found.has(e)) found.set(e, { name: name.trim(), email: e });
  };

  for (const tok of fd.getAll("recipients").map(String)) {
    if (tok === "g:resellers") {
      const r = await db.execute("SELECT COALESCE(NULLIF(display_name, ''), username) AS name, email FROM users WHERE role != 'admin' AND suspended = 0 AND email != ''");
      r.rows.forEach((x) => add(String(x.name), String(x.email)));
    } else if (tok === "g:customers") {
      const r = await db.execute("SELECT name, email FROM customers WHERE email != ''");
      r.rows.forEach((x) => add(String(x.name), String(x.email)));
    } else {
      const [kind, rawId] = tok.split(":");
      const id = Number(rawId);
      if (!Number.isInteger(id) || id <= 0) continue;
      if (kind === "c") {
        const r = await db.execute({ sql: "SELECT name, email FROM customers WHERE id = ?", args: [id] });
        if (r.rows[0]) add(String(r.rows[0].name), String(r.rows[0].email));
      } else if (kind === "r") {
        const r = await db.execute({
          sql: "SELECT COALESCE(NULLIF(display_name, ''), username) AS name, email FROM users WHERE id = ? AND role != 'admin'",
          args: [id],
        });
        if (r.rows[0]) add(String(r.rows[0].name), String(r.rows[0].email));
      }
    }
  }
  for (const extra of text(fd, "extra", 600).split(/[,;\s]+/).filter(Boolean)) add("", extra);

  const recipients = [...found.values()];
  if (recipients.length === 0) return { error: "Elige al menos un destinatario con correo válido." };
  if (recipients.length > MAX_RECIPIENTS)
    return { error: `Máximo ${MAX_RECIPIENTS} destinatarios por envío (elegiste ${recipients.length}).` };

  const amount = money(fd, "monto");
  const base: Vars = {
    tienda: siteConfig.name,
    whatsapp: `https://wa.me/${siteConfig.whatsappNumber}`,
    monto: amount ? formatPrice(amount) : "",
    concepto: text(fd, "concepto", 160),
    fecha_limite: text(fd, "fecha_limite", 30),
  };

  // Antes de enviar nada, comprobamos que ningún mensaje quede con {{variables}} sin llenar.
  const pending = new Set<string>();
  for (const r of recipients) {
    const vars = { ...base, nombre: r.name || "cliente" };
    missingVars(renderTemplate(subject, vars)).forEach((v) => pending.add(v));
    missingVars(renderTemplate(body, vars)).forEach((v) => pending.add(v));
  }
  if (pending.size > 0)
    return {
      error: `Faltan valores para: ${[...pending].map((v) => `{{${v}}}`).join(", ")}. Llénalos arriba o quita esas variables del mensaje.`,
    };

  let sent = 0;
  const failed: string[] = [];
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const vars = { ...base, nombre: r.name || "cliente" };
    const finalSubject = renderTemplate(subject, vars);
    const finalBody = renderTemplate(body, vars);
    const result = await sendEmail({ to: r.email, subject: finalSubject, body: finalBody });
    await db.execute({
      sql: "INSERT INTO email_log (to_email, to_name, subject, body, template, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [r.email, r.name, finalSubject, finalBody, template, result.ok ? "enviado" : "fallido", result.ok ? "" : result.error, Date.now()],
    });
    if (result.ok) sent++;
    else failed.push(`${r.email} (${result.error})`);
    // Resend limita a ~2 envíos por segundo.
    if (i < recipients.length - 1) await new Promise((res) => setTimeout(res, 600));
  }
  refresh();
  if (failed.length === 0) return { ok: true, message: `Enviamos ${sent} correo${sent === 1 ? "" : "s"}.` };
  return {
    error: `Enviados ${sent} de ${recipients.length}. Fallaron: ${failed.join("; ")}`,
  };
}
