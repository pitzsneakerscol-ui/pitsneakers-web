"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { hashPassword, isReservedUsername, requireAdmin } from "@/lib/auth";
import { insertItems } from "@/lib/reseller";
import { runSync } from "@/lib/seller-sync";
import { notifyInventory } from "@/lib/seller-notify";
import { createNotification } from "@/lib/notifications";
import { getQuestion, saveAnswer, type Verdict } from "@/lib/market";
import { answerEmail, verdictLabel } from "@/lib/market-emails";
import { cleanUsername, usernameError } from "@/lib/username";
import { accessEmail, waLink, waNumber, welcomeMessage } from "@/lib/admin-shared";
import { siteConfig } from "@/config/site";
import { parseSizes, readItem } from "@/lib/item-form";
import { isEmail, isValidDate, todayBogota, type ActionState } from "@/lib/reseller-shared";
import { PAYMENT_METHODS, listTemplates } from "@/lib/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { DEFAULT_TEMPLATES, TEMPLATE_VERSION, missingVars, renderTemplate, siteVars, type Vars } from "@/lib/email-templates";
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
  // La puede escribir el dueño; si la deja vacía se genera una sin caracteres ambiguos (0/O, 1/l/I) para dictarla fácil por WhatsApp.
  const chosen = String(fd.get("password") ?? "");
  if (chosen && (chosen.length < 8 || chosen.length > 100)) return { error: "La contraseña debe tener al menos 8 caracteres." };
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  const temp = chosen || Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const db = await getDb();
  const res = await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ? AND role != 'admin'",
    args: [await hashPassword(temp), id],
  });
  if (res.rowsAffected === 0) return { error: "No se encontró el revendedor." };
  await db.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [id] });
  const who = await db.execute({ sql: "SELECT username, display_name, whatsapp, email FROM users WHERE id = ?", args: [id] });
  const uname = String(who.rows[0].username);
  await db.execute({ sql: "DELETE FROM rate_limits WHERE key = ?", args: [`loginfail:${uname}`] });
  const waNum = waNumber(String(who.rows[0].whatsapp ?? ""));
  const wa = waNum
    ? waLink(waNum, welcomeMessage({ name: String(who.rows[0].display_name || uname), username: uname, password: temp, siteUrl: siteConfig.siteUrl, reset: true }))
    : undefined;
  const mail = await mailAccess(String(who.rows[0].email ?? ""), {
    name: String(who.rows[0].display_name || uname),
    username: uname,
    password: temp,
    reset: true,
  });
  return {
    ok: true,
    wa,
    message:
      (chosen
        ? "Contraseña cambiada a la que escribiste."
        : `Contraseña temporal: ${temp} (solo se muestra ahora).`) + ` ${mail}`,
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
      sql: "UPDATE email_templates SET name = ?, subject = ?, body = ?, updated_at = ?, tpl_version = 1000 WHERE key = ?",
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
    sql: "UPDATE email_templates SET name = ?, subject = ?, body = ?, updated_at = ?, tpl_version = ? WHERE key = ?",
    args: [def.name, def.subject, def.body, Date.now(), TEMPLATE_VERSION, key],
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
    ...siteVars(),
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

/* ---------- Cuentas de revendedor y stock cargado por el dueño ---------- */

const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Envía el acceso por correo si el vendedor tiene correo y el envío está configurado. Devuelve una frase para mostrar al dueño. */
async function mailAccess(
  to: string,
  data: { name: string; username: string; password: string; reset?: boolean }
): Promise<string> {
  if (!to) return "No se envió correo (el vendedor no tiene correo registrado): envíale el acceso por WhatsApp con el botón.";
  if (!isEmailConfigured()) return "No se envió correo porque el envío de correos aún no está configurado: usa el botón de WhatsApp.";
  const { subject, body } = accessEmail({ ...data, siteUrl: siteConfig.siteUrl });
  const res = await sendEmail({ to, subject, body });
  return res.ok
    ? `✉️ Le enviamos el acceso por correo a ${to}.`
    : `No pudimos enviar el correo (${res.error}): usa el botón de WhatsApp.`;
}

/** El dueño le crea la cuenta a un revendedor: la contraseña temporal se genera aquí y se muestra una sola vez. */
export async function createReseller(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const username = cleanUsername(String(fd.get("username") ?? ""));
  const displayName = text(fd, "displayName", 40);
  const whatsapp = text(fd, "whatsapp", 20).replace(/[^\d]/g, "");
  const email = text(fd, "email", 120).toLowerCase();

  if (isReservedUsername(username)) return { error: "Ese usuario no está disponible. Prueba con otro." };
  const badUser = usernameError(username);
  if (badUser) return { error: badUser };
  if (!whatsapp || whatsapp.length < 7 || whatsapp.length > 15)
    return { error: "Escribe el WhatsApp del vendedor con indicativo (ej. 573001234567): queda registrado en su perfil." };
  if (email && !isEmail(email)) return { error: "El correo no parece válido." };

  // La contraseña la puede poner el dueño; si la deja vacía, se genera una.
  const chosen = String(fd.get("password") ?? "");
  if (chosen && (chosen.length < 8 || chosen.length > 100)) return { error: "La contraseña debe tener al menos 8 caracteres." };
  const temp = chosen || Array.from(randomBytes(10), (b) => TEMP_ALPHABET[b % TEMP_ALPHABET.length]).join("");
  const db = await getDb();
  try {
    await db.execute({
      sql: "INSERT INTO users (username, display_name, whatsapp, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [username, displayName || username, whatsapp, email, await hashPassword(temp), Date.now()],
    });
  } catch {
    return { error: "Ese usuario ya existe. Prueba con otro." };
  }
  refresh();
  const name = displayName || username;
  const wa = waLink(waNumber(whatsapp), welcomeMessage({ name, username, password: temp, siteUrl: siteConfig.siteUrl }));
  const mail = await mailAccess(email, { name, username, password: temp });
  return {
    ok: true,
    wa,
    message:
      (chosen
        ? `Cuenta creada. Usuario: ${username} · Contraseña: la que escribiste.`
        : `Cuenta creada. Usuario: ${username} · Contraseña temporal: ${temp} (solo se muestra ahora).`) + ` ${mail}`,
  };
}

/** El dueño carga pares (del catálogo o nuevos) directamente en el inventario de un revendedor. */
export async function adminAddItems(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = int(fd, "userId");
  if (!userId) return { error: "Revendedor inválido." };
  const db = await getDb();
  const who = await db.execute({ sql: "SELECT username FROM users WHERE id = ? AND role != 'admin'", args: [userId] });
  if (!who.rows[0]) return { error: "No se encontró el revendedor." };

  const parsed = readItem(fd);
  if ("error" in parsed) return { error: parsed.error };
  const sizes = parseSizes(text(fd, "sizes", 300));
  if (sizes.length === 0) return { error: "Indica al menos una talla (ej: 9, 9.5, 10x2)." };
  if (sizes.length > 60) return { error: "Máximo 60 pares por registro." };
  const data = { ...parsed.data, source: parsed.data.source || "Cargado por Pitsneakers" };

  // Si el par ya está en su stock con esa talla (mismo producto del catálogo), no se duplica.
  let toAdd = sizes;
  let skipped = 0;
  if (data.catalogSlug) {
    const have = await db.execute({
      sql: "SELECT size FROM items WHERE user_id = ? AND catalog_slug = ? AND status != 'vendido'",
      args: [userId, data.catalogSlug],
    });
    const taken = new Map<string, number>();
    for (const r of have.rows) taken.set(String(r.size), (taken.get(String(r.size)) ?? 0) + 1);
    toAdd = sizes.filter((s) => {
      const left = taken.get(s) ?? 0;
      if (left > 0) {
        taken.set(s, left - 1);
        skipped++;
        return false;
      }
      return true;
    });
  }
  const n = toAdd.length ? await insertItems(userId, data, toAdd) : 0;
  refresh();
  const extra = skipped ? ` (${skipped} ya estaba${skipped === 1 ? "" : "n"} en su stock y no se duplicó)` : "";
  const mail = n > 0 ? await notifyInventory(userId, toAdd.map((size) => ({ name: data.name, size, price: data.expectedPrice }))) : "off";
  const aviso =
    n === 0
      ? ""
      : mail === "sent"
        ? " ✉️ Le avisamos por correo."
        : mail === "no-email"
          ? " No se le avisó por correo (no tiene correo registrado)."
          : mail === "fail"
            ? " No pudimos enviarle el aviso por correo."
            : "";
  return {
    ok: true,
    message: `${n === 1 ? "Cargamos 1 par" : `Cargamos ${n} pares`} a @${String(who.rows[0].username)}${extra}.${aviso}`,
  };
}

/** Carga en las cuentas de los vendedores los pares del catálogo que tienen su usuario en la columna VENDEDOR. */
export async function syncSellerCatalog(): Promise<ActionState> {
  await requireAdmin();
  const { added, sellers, waiting, notices } = await runSync();
  refresh();
  const wait = waiting.length ? ` Esperando cuenta: ${waiting.map((w) => `@${w}`).join(", ")}.` : "";
  if (added === 0) return { ok: true, message: `No había pares nuevos por cargar.${wait}` };

  // Aviso automático por correo a cada vendedor al que se le cargaron pares.
  let sent = 0;
  const noEmail: string[] = [];
  let failed = 0;
  for (const n of notices) {
    const r = await notifyInventory(n.userId, n.items);
    if (r === "sent") sent++;
    else if (r === "no-email") noEmail.push(`@${n.username}`);
    else if (r === "fail") failed++;
  }
  const aviso =
    (sent ? ` ✉️ Avisamos por correo a ${sent} vendedor${sent === 1 ? "" : "es"}.` : "") +
    (noEmail.length ? ` Sin correo registrado: ${noEmail.join(", ")}.` : "") +
    (failed ? ` No pudimos enviar ${failed} aviso${failed === 1 ? "" : "s"}.` : "");
  return {
    ok: true,
    message: `${added === 1 ? "Se cargó 1 par" : `Se cargaron ${added} pares`} en ${sellers === 1 ? "1 cuenta" : `${sellers} cuentas`}.${aviso}${wait}`,
  };
}

/* ---------- Consultas de mercado de los revendedores ---------- */

/** El equipo responde una consulta: se guarda, le llega un aviso en la campana y, si tiene correo, un email. */
export async function answerQuestion(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = int(fd, "id");
  const verdict = String(fd.get("verdict") ?? "");
  const answer = text(fd, "answer", 1500);
  if (!id) return { error: "Consulta inválida." };
  if (!["comprar", "esperar", "no"].includes(verdict)) return { error: "Elige tu recomendación: comprar, esperar o no." };
  const q = await getQuestion(id);
  if (!q) return { error: "No se encontró la consulta." };
  if (!(await saveAnswer(id, verdict as Verdict, answer))) return { error: "No se pudo guardar la respuesta." };

  await createNotification(q.userId, {
    kind: "consulta",
    title: `El equipo respondió tu consulta: ${q.model}`,
    body: verdictLabel(verdict),
    href: "/revendedores/consultas",
  });

  let mail = "";
  if (q.sellerEmail && isEmailConfigured()) {
    const { subject, body } = answerEmail({
      name: q.sellerName,
      model: q.model,
      size: q.size,
      verdict,
      answer,
      url: `${siteConfig.siteUrl.replace(/\/$/, "")}/revendedores/consultas`,
    });
    const res = await sendEmail({ to: q.sellerEmail, subject, body });
    mail = res.ok ? ` ✉️ También le llegó por correo a ${q.sellerEmail}.` : " No pudimos enviarle el correo, pero ya le salió el aviso en su panel.";
  } else if (!q.sellerEmail) {
    mail = " No tiene correo registrado: le salió el aviso en su panel.";
  }
  refresh();
  return { ok: true, message: `Respuesta enviada a ${q.sellerName}.${mail}` };
}

/* ---------- Ofertas por un par ---------- */

/**
 * El dueño avisa que llegó una oferta por un par de un vendedor: le llega a la campana de su panel y, si tiene correo,
 * un email con la plantilla "Oferta por un par" (la que tengas editada en Plantillas).
 */
export async function notifyOffer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const itemId = int(fd, "itemId");
  const amount = money(fd, "monto");
  const until = text(fd, "hasta", 40);
  const note = text(fd, "nota", 300);
  if (!itemId) return { error: "Par inválido." };
  if (!amount) return { error: "Escribe cuánto están ofreciendo." };

  const db = await getDb();
  const r = await db.execute({
    sql: `SELECT i.name AS name, i.brand AS brand, i.size AS size, i.user_id AS user_id,
                 u.username AS username, u.display_name AS display_name, u.email AS email
          FROM items i JOIN users u ON u.id = i.user_id WHERE i.id = ? AND u.role != 'admin'`,
    args: [itemId],
  });
  const row = r.rows[0];
  if (!row) return { error: "No se encontró el par." };

  const brand = String(row.brand ?? "");
  const name = String(row.name);
  const par = brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name;
  const size = String(row.size ?? "");
  const concepto = size ? `${par} (talla ${size})` : par;
  const seller = String(row.display_name || row.username);
  const price = formatPrice(amount);

  await createNotification(Number(row.user_id), {
    kind: "inventario",
    title: `Oferta de ${price} por tu ${par}`,
    body: `${size ? `Talla ${size}. ` : ""}${until ? `Vigente hasta ${until}. ` : ""}${note ? `${note} ` : ""}Respóndenos por WhatsApp para aceptarla o contraofertar.`.trim(),
    href: "/revendedores/inventario",
  });

  let mail = "";
  const to = String(row.email ?? "");
  if (!to) mail = " No tiene correo registrado: solo le salió el aviso en su panel.";
  else if (!isEmailConfigured()) mail = " El correo aún no está configurado: solo le salió el aviso en su panel.";
  else {
    const tpl = (await listTemplates()).find((t) => t.key === "oferta_par") ?? DEFAULT_TEMPLATES.find((t) => t.key === "oferta_par")!;
    const vars: Vars = { ...siteVars(), nombre: seller, concepto, monto: price, fecha_limite: until || "responde lo antes posible" };
    const subject = renderTemplate(tpl.subject, vars);
    let bodyLines = renderTemplate(tpl.body, vars).split("\n");
    if (note) {
      const at = bodyLines.findIndex((l) => l.startsWith("> **Vigente"));
      bodyLines.splice(at >= 0 ? at + 1 : bodyLines.length, 0, `> **Comentario:** ${note}`);
    }
    bodyLines = bodyLines.filter((l) => !/^>\s*$/.test(l.trim()));
    const body = bodyLines.join("\n");
    const res = await sendEmail({ to, subject, body });
    await db.execute({
      sql: "INSERT INTO email_log (to_email, to_name, subject, body, template, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [to, seller, subject, body, "oferta_par", res.ok ? "enviado" : "fallido", res.ok ? "" : res.error, Date.now()],
    });
    mail = res.ok ? ` ✉️ También le llegó por correo a ${to}.` : ` No pudimos enviarle el correo (${res.error}), pero ya le salió el aviso en su panel.`;
  }
  refresh();
  return { ok: true, message: `Aviso enviado a ${seller}: oferta de ${price} por ${par}.${mail}` };
}
