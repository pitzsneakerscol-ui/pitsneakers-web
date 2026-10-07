"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, isDbConfigured } from "@/lib/db";
import {
  adminUsername,
  checkAdminPassword,
  clientIp,
  createSession,
  isReservedUsername,
  destroyOtherSessions,
  destroySession,
  hashPassword,
  rateLimitBlocked,
  rateLimitClear,
  rateLimitHit,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import {
  MAX_IMPORT_ROWS,
  deleteItem as dbDeleteItem,
  insertImported,
  insertItems,
  parseInventoryCsv,
  sellItem as dbSellItem,
  setItemStatus,
  updateItem as dbUpdateItem,
  type NewItemData,
} from "@/lib/reseller";
import {
  SALE_CHANNELS,
  isEmail,
  isValidDate,
  todayBogota,
  type ActionState,
} from "@/lib/reseller-shared";

const MIN = 60 * 1000;
const PANEL = "/revendedores/panel";

/* ---------- Utilidades ---------- */

const text = (fd: FormData, key: string, max: number): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
};

function money(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const digits = v.replace(/[^\d]/g, "");
  if (digits === "") return null;
  return Math.min(Number(digits), 1_000_000_000);
}

function refresh() {
  revalidatePath("/revendedores", "layout");
}

/* ---------- Cuenta ---------- */

export async function register(
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  if (!isDbConfigured()) return { error: "El registro aún no está disponible." };
  if (text(fd, "website", 50) !== "") return { error: "No pudimos crear la cuenta." };

  const username = text(fd, "username", 24).toLowerCase();
  const displayName = text(fd, "displayName", 40);
  const whatsapp = text(fd, "whatsapp", 20).replace(/[^\d]/g, "");
  const email = text(fd, "email", 120).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (isReservedUsername(username)) return { error: "Ese usuario no está disponible. Prueba con otro." };
  if (email && !isEmail(email)) return { error: "El correo no parece válido." };
  if (!/^[a-z0-9._-]{3,24}$/.test(username))
    return {
      error: "El usuario debe tener 3 a 24 caracteres: letras, números, punto, guion o guion bajo.",
    };
  if (password.length < 8 || password.length > 100)
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };
  if (whatsapp && (whatsapp.length < 7 || whatsapp.length > 15))
    return { error: "El número de WhatsApp no parece válido." };

  const ip = await clientIp();
  if (!(await rateLimitHit(`signup:${ip}`, 5, 60 * MIN)))
    return { error: "Demasiados registros desde esta conexión. Intenta más tarde." };

  const db = await getDb();
  const passwordHash = await hashPassword(password);
  let userId: number;
  try {
    const res = await db.execute({
      sql: "INSERT INTO users (username, display_name, whatsapp, email, password_hash, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [username, displayName || username, whatsapp, email, passwordHash, Date.now(), Date.now()],
    });
    userId = Number(res.lastInsertRowid);
  } catch {
    return { error: "Ese usuario ya existe. Prueba con otro." };
  }
  await createSession(userId);
  redirect(PANEL);
}

export async function login(
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  if (!isDbConfigured()) return { error: "El ingreso aún no está disponible." };
  const username = text(fd, "username", 24).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!username || !password) return { error: "Escribe tu usuario y contraseña." };

  const ip = await clientIp();
  const userKey = `loginfail:${username}`;
  const ipKey = `loginfail:ip:${ip}`;
  if ((await rateLimitBlocked(userKey, 5)) || (await rateLimitBlocked(ipKey, 30)))
    return { error: "Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo." };

  const db = await getDb();
  const fail = async (): Promise<ActionState> => {
    await rateLimitHit(userKey, 5, 15 * MIN);
    await rateLimitHit(ipKey, 30, 15 * MIN);
    return { error: "Usuario o contraseña incorrectos." };
  };

  // Cuenta del dueño: su contraseña vive en variables de entorno, no en la base.
  if (username === adminUsername()) {
    if (!checkAdminPassword(password)) return fail();
    await db.execute({
      sql: `INSERT INTO users (username, display_name, password_hash, role, created_at)
            VALUES (?, 'Pitsneakers', '!', 'admin', ?)
            ON CONFLICT(username) DO UPDATE SET role = 'admin', suspended = 0, password_hash = '!'`,
      args: [username, Date.now()],
    });
    const adm = await db.execute({ sql: "SELECT id FROM users WHERE username = ?", args: [username] });
    await rateLimitClear(userKey);
    await db.execute({ sql: "UPDATE users SET last_login = ? WHERE username = ?", args: [Date.now(), username] });
    await createSession(Number(adm.rows[0].id));
    redirect("/admin");
  }

  const res = await db.execute({
    sql: "SELECT id, password_hash, suspended, role FROM users WHERE username = ?",
    args: [username],
  });
  const row = res.rows[0];
  const ok = await verifyPassword(password, row ? String(row.password_hash) : null);
  if (!row || !ok || row.role === "admin") return fail();
  if (Number(row.suspended) === 1)
    return { error: "Tu cuenta está suspendida. Escríbenos por WhatsApp para resolverlo." };
  await rateLimitClear(userKey);
  await db.execute({ sql: "UPDATE users SET last_login = ? WHERE id = ?", args: [Date.now(), Number(row.id)] });
  await createSession(Number(row.id));
  redirect(PANEL);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/revendedores");
}

export async function updateProfile(
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const displayName = text(fd, "displayName", 40);
  const whatsapp = text(fd, "whatsapp", 20).replace(/[^\d]/g, "");
  const email = text(fd, "email", 120).toLowerCase();
  if (whatsapp && (whatsapp.length < 7 || whatsapp.length > 15))
    return { error: "El número de WhatsApp no parece válido." };
  if (email && !isEmail(email)) return { error: "El correo no parece válido." };
  const db = await getDb();
  await db.execute({
    sql: "UPDATE users SET display_name = ?, whatsapp = ?, email = ? WHERE id = ?",
    args: [displayName || user.username, whatsapp, email, user.id],
  });
  refresh();
  return { ok: true, message: "Perfil actualizado." };
}

export async function changePassword(
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (next.length < 8 || next.length > 100)
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  if (next !== confirm) return { error: "Las contraseñas nuevas no coinciden." };

  const key = `pwfail:${user.id}`;
  if (await rateLimitBlocked(key, 5))
    return { error: "Demasiados intentos. Espera 15 minutos." };

  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT password_hash FROM users WHERE id = ?",
    args: [user.id],
  });
  const hash = res.rows[0] ? String(res.rows[0].password_hash) : null;
  if (!(await verifyPassword(current, hash))) {
    await rateLimitHit(key, 5, 15 * MIN);
    return { error: "La contraseña actual no es correcta." };
  }
  await rateLimitClear(key);
  await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [await hashPassword(next), user.id],
  });
  await destroyOtherSessions(user.id);
  return { ok: true, message: "Contraseña cambiada. Cerramos tus otras sesiones." };
}

/* ---------- Inventario ---------- */

function readItem(
  fd: FormData
): { data: NewItemData } | { error: string } {
  const name = text(fd, "name", 120);
  if (!name) return { error: "Escribe el nombre del par." };

  const cost = money(fd, "cost");
  if (cost === null) return { error: "Indica cuánto pagaste por el par (puede ser 0)." };
  const extraCost = money(fd, "extraCost") ?? 0;
  const expectedPrice = money(fd, "expectedPrice") ?? 0;

  const today = todayBogota();
  const rawDate = text(fd, "purchaseDate", 10);
  if (rawDate && !isValidDate(rawDate)) return { error: "La fecha de compra no es válida." };

  const imageUrl = text(fd, "imageUrl", 300);
  if (imageUrl && !/^(https:\/\/|\/products\/)/.test(imageUrl))
    return { error: "La foto debe ser un link https:// (o dejarse vacía)." };

  const catalogSlug = text(fd, "catalogSlug", 120);
  if (catalogSlug && !/^[a-z0-9-]+$/.test(catalogSlug)) return { error: "Referencia de catálogo inválida." };

  return {
    data: {
      brand: text(fd, "brand", 60),
      name,
      colorway: text(fd, "colorway", 80),
      sku: text(fd, "sku", 40),
      condition: fd.get("condition") === "usado" ? "usado" : "nuevo",
      cost,
      extraCost,
      expectedPrice,
      purchaseDate: rawDate || today,
      source: text(fd, "source", 80),
      notes: text(fd, "notes", 500),
      imageUrl,
      catalogSlug,
    },
  };
}

/** "9, 9.5, 10x2" -> ["9", "9.5", "10", "10"] */
function parseSizes(raw: string): string[] {
  const out: string[] = [];
  for (const token of raw.split(/[,;]+/)) {
    const t = token.trim();
    if (!t) continue;
    const m = t.match(/^(.+?)\s*[x×]\s*(\d{1,2})$/i);
    const size = (m ? m[1] : t).trim().slice(0, 12);
    const count = m ? Math.max(1, Math.min(Number(m[2]), 20)) : 1;
    for (let i = 0; i < count; i++) out.push(size);
  }
  return out;
}

export async function addItems(
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = readItem(fd);
  if ("error" in parsed) return { error: parsed.error };
  const sizes = parseSizes(text(fd, "sizes", 300));
  if (sizes.length === 0) return { error: "Indica al menos una talla (ej: 9, 9.5, 10x2)." };
  if (sizes.length > 60) return { error: "Máximo 60 pares por registro." };
  const n = await insertItems(user.id, parsed.data, sizes);
  refresh();
  return { ok: true, message: n === 1 ? "Agregamos 1 par al inventario." : `Agregamos ${n} pares al inventario.` };
}

export async function updateItem(
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return { error: "Par no encontrado." };
  const parsed = readItem(fd);
  if ("error" in parsed) return { error: parsed.error };
  const size = text(fd, "size", 12);
  if (!size) return { error: "Indica la talla." };
  const ok = await dbUpdateItem(user.id, id, { ...parsed.data, size });
  if (!ok) return { error: "Par no encontrado." };
  refresh();
  return { ok: true, message: "Cambios guardados." };
}

export async function sellItem(
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return { error: "Par no encontrado." };
  const soldPrice = money(fd, "soldPrice");
  if (soldPrice === null || soldPrice <= 0) return { error: "Indica el precio de venta." };
  const soldDate = text(fd, "soldDate", 10) || todayBogota();
  if (!isValidDate(soldDate)) return { error: "La fecha de venta no es válida." };
  const channelRaw = text(fd, "soldChannel", 30);
  const soldChannel = (SALE_CHANNELS as readonly string[]).includes(channelRaw) ? channelRaw : "Otro";
  const ok = await dbSellItem(user.id, id, {
    soldPrice,
    soldDate,
    soldChannel,
    saleFees: money(fd, "saleFees") ?? 0,
    buyer: text(fd, "buyer", 80),
  });
  if (!ok) return { error: "No pudimos registrar la venta (¿ya estaba vendido?)." };
  refresh();
  return { ok: true, message: "Venta registrada." };
}

export async function setStatus(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const status = fd.get("status");
  if (!Number.isInteger(id) || (status !== "stock" && status !== "reservado")) return;
  await setItemStatus(user.id, id, status);
  refresh();
}

export async function deleteItem(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;
  await dbDeleteItem(user.id, id);
  refresh();
}

export async function importCsv(
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige un archivo .csv." };
  if (file.size > 400_000) return { error: "El archivo es muy grande (máx. 400 KB)." };
  const { rows, errors } = parseInventoryCsv(await file.text(), todayBogota());
  if (rows.length === 0) return { error: errors[0] ?? "No encontramos pares para importar." };
  const n = await insertImported(user.id, rows);
  refresh();
  const skipped = errors.length
    ? ` ${errors.length} fila(s) omitida(s): ${errors.slice(0, 3).join(" ")}`
    : "";
  return {
    ok: true,
    message: `Importamos ${n} par(es) (límite ${MAX_IMPORT_ROWS} por archivo).${skipped}`,
  };
}
