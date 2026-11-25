import "server-only";
import { cache } from "react";
import assignmentsJson from "@/data/assignments.json";
import productsJson from "@/data/products.json";
import { getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { siteConfig } from "@/config/site";
import { insertItems } from "@/lib/reseller";
import { kindsPhrase, todayBogota, type ItemKind } from "@/lib/reseller-shared";
import { catalogIndex } from "@/lib/catalog-index";
import { fullTitle } from "@/lib/catalog-match";
import type { SellerAssignment } from "@/lib/sheet-source";
import type { Product } from "@/types/product";

const assignments = assignmentsJson as SellerAssignment[];

export interface SyncPair {
  name: string;
  size: string;
}

export interface SyncRow {
  /** usuario del vendedor tal como está en la columna VENDEDOR del CSV */
  seller: string;
  /** si ya existe la cuenta */
  userId: number | null;
  displayName: string;
  /** pares que faltan cargar en su inventario (uno por unidad) */
  pending: SyncPair[];
  /** pares que ya tiene cargados */
  loaded: number;
  /** si la cuenta se encontró por parecido (otro usuario, sin puntos, etc.), el usuario real de la cuenta */
  matchedAs?: string;
}

const normName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const normSize = (s: string) => s.trim().toLowerCase().replace(",", ".");

/** Mismo artículo: nombre igual, o todas las palabras del más corto están en el más largo (mínimo dos palabras). */
function sameName(a: string, b: string): boolean {
  const x = normName(a);
  const y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  const words = short.split(" ");
  if (words.length < 2) return false;
  const set = new Set(long.split(" "));
  return words.every((w) => set.has(w));
}

const catalog = catalogIndex(productsJson as unknown as Product[]);

/**
 * Cuántas unidades de cada par asignado tiene ya el vendedor en su inventario, por "slug|talla" (cualquier estado, incluido
 * "vendido", para no volver a cargar lo que ya vendió). Evita cargar dos veces lo que el vendedor ya metió a mano:
 *  1. Los artículos enlazados a ese par exacto.
 *  2. Los enlazados al mismo modelo por otro slug (el del modelo, que es lo que elige el vendedor al cargar).
 *  3. Los que no tienen enlace pero son ese modelo por su código de estilo o por su nombre completo (modelo + colorway).
 *  4. Los que no se reconocen del todo pero se llaman parecido: ocupan el cupo para no duplicar, y solo se enlazan si no hay duda.
 * Con apply=true los de 2 y 3 quedan enlazados al par (y traen la foto si no tenían).
 */
async function reconcile(userId: number, list: SellerAssignment[], apply: boolean): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = (
    await db.execute({ sql: "SELECT id, name, brand, colorway, sku, size, image_url, catalog_slug FROM items WHERE user_id = ?", args: [userId] })
  ).rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    brand: String(r.brand),
    colorway: String(r.colorway ?? ""),
    sku: String(r.sku ?? ""),
    size: normSize(String(r.size)),
    slug: String(r.catalog_slug),
  }));

  const have = new Map<string, number>();
  const slots = list.flatMap((a) =>
    (a.sizes.length ? [...new Set(a.sizes)] : [""]).map((size) => ({
      a,
      key: `${a.slug}|${normSize(size)}`,
      size: normSize(size),
      wanted: a.counts?.[size] ?? 1,
      group: catalog.groupOf(a.slug)?.groupSlug ?? "",
    }))
  );
  const left = (slot: (typeof slots)[number]) => slot.wanted - (have.get(slot.key) ?? 0);
  const link = async (slot: (typeof slots)[number], id: number) => {
    have.set(slot.key, (have.get(slot.key) ?? 0) + 1);
    if (!apply) return;
    await db.execute({
      sql: "UPDATE items SET catalog_slug = ?, image_url = CASE WHEN image_url = '' THEN ? ELSE image_url END WHERE id = ? AND user_id = ?",
      args: [slot.a.slug, slot.a.image, id, userId],
    });
  };

  // 1. Enlazados al par exacto.
  const mine = new Set(list.map((a) => a.slug));
  for (const r of rows) if (mine.has(r.slug)) have.set(`${r.slug}|${r.size}`, (have.get(`${r.slug}|${r.size}`) ?? 0) + 1);

  // 2. Enlazados al mismo modelo por otro slug.
  for (const r of rows) {
    if (!r.slug || mine.has(r.slug)) continue;
    const group = catalog.groupOf(r.slug)?.groupSlug;
    const slot = group ? slots.find((x) => x.group === group && x.size === r.size && left(x) > 0) : undefined;
    if (slot) await link(slot, r.id);
  }

  // 3. Sin enlace, pero el código o el nombre completo dicen qué modelo es.
  const free = rows.filter((r) => !r.slug).map((r) => ({ ...r, group: catalog.matcher.resolve(r)?.model.slug ?? "" }));
  const used = new Set<number>();
  for (const slot of slots) {
    while (slot.group && left(slot) > 0) {
      const hit = free.find((x) => !used.has(x.id) && x.size === slot.size && x.group === slot.group);
      if (!hit) break;
      used.add(hit.id);
      await link(slot, hit.id);
    }
  }

  // 4. No se reconoce el modelo, pero el nombre se parece al del par asignado.
  for (const slot of slots) {
    while (left(slot) > 0) {
      const title = fullTitle(slot.a.name, slot.a.colorway);
      const similar = free.filter((x) => {
        if (used.has(x.id) || x.group || x.size !== slot.size) return false;
        const typed = fullTitle(x.name, x.colorway);
        return sameName(typed, title) || sameName(`${x.brand} ${typed}`, `${slot.a.brand} ${title}`);
      });
      if (similar.length === 0) break;
      used.add(similar[0].id);
      if (similar.length === 1) await link(slot, similar[0].id);
      else have.set(slot.key, (have.get(slot.key) ?? 0) + 1); // varios candidatos: ocupa el cupo sin enlazar; el dueño confirma el modelo en "Por completar"
    }
  }
  return have;
}

/** Tallas que faltan de un par: una entrada por unidad (un par con cantidad 3 en la talla 9 puede devolver "9" tres veces). */
function missingSizes(a: SellerAssignment, have: Map<string, number>): string[] {
  const out: string[] = [];
  for (const size of a.sizes.length ? [...new Set(a.sizes)] : [""]) {
    const wanted = a.counts?.[size] ?? 1;
    const already = have.get(`${a.slug}|${normSize(size)}`) ?? 0;
    for (let i = already; i < wanted; i++) out.push(size);
  }
  return out;
}

/** Solo letras y números, en minúsculas y sin tildes: "drrip.814", "Drrip_814" y "drrip 814" quedan iguales. */
const loose = (s: string) => normName(s).replace(/ /g, "");

/**
 * Avisa a un vendedor cuando otro vendedor tiene el mismo par (mismo nombre y talla) más barato en el catálogo.
 * No dice quién es. Se avisa una sola vez por par, talla y precio (si el otro baja más el precio, se avisa de nuevo).
 * Devuelve cuántos avisos nuevos creó.
 */
export async function notifyCheaper(userId: number, keys: string[]): Promise<number> {
  const mine = assignments.filter((a) => keys.includes(a.seller));
  // Con quién se compara: los demás vendedores y también los pares del catálogo público que no tienen vendedor asignado.
  const assignedSlugs = new Set(assignments.map((a) => a.slug));
  const publicFree = (productsJson as { slug: string; name: string; brand: string; price: number; sizes: string[] }[])
    .filter((p) => !assignedSlugs.has(p.slug))
    .map((p) => ({ name: p.name, brand: p.brand, price: p.price, sizes: p.sizes }));
  const others: { name: string; brand: string; price: number; sizes: string[] }[] = [...assignments.filter((a) => !keys.includes(a.seller)), ...publicFree];
  if (mine.length === 0 || others.length === 0) return 0;
  const db = await getDb();
  let created = 0;
  const lines: string[] = [];
  for (const a of mine) {
    for (const size of a.sizes.length ? [...new Set(a.sizes)] : [""]) {
      // Todos los demás vendedores con el mismo par y la misma talla.
      const peers = others.filter(
        (b) => b.price > 0 && (b.sizes.length ? b.sizes.map(normSize).includes(normSize(size)) : size === "") && (sameName(b.name, a.name) || sameName(`${b.brand} ${b.name}`, `${a.brand} ${a.name}`))
      );
      const cheaper = peers.filter((b) => b.price < a.price).sort((x, y) => x.price - y.price);
      if (cheaper.length === 0) continue;
      const rank = cheaper.length + 1; // puesto por precio: 1 = el más económico
      const total = peers.length + 1;
      const money = (v: number) => `$${v.toLocaleString("es-CO")}`;
      const label = `${a.name}${size ? ` talla ${size}` : ""}`;
      const title = `Tu ${label} va en el puesto ${rank} de ${total} por precio`;
      const body = `Hay ${cheaper.length === 1 ? "uno más económico" : `${cheaper.length} más económicos`} en el mercado (desde ${money(cheaper[0].price)}; el tuyo está en ${money(a.price)}). No es ningún problema y tu par sigue disponible, pero si quieres venderlo más rápido, tenlo en cuenta.`;
      const dup = await db.execute({ sql: "SELECT 1 FROM notifications WHERE user_id = ? AND title = ? AND body = ? LIMIT 1", args: [userId, title.slice(0, 120), body.slice(0, 400)] });
      if (dup.rows.length > 0) continue;
      await createNotification(userId, { kind: "info", title, body, href: "/revendedores/inventario" });
      lines.push(`- **${a.name}${size ? ` · talla ${size}` : ""}**: puesto ${rank} de ${total} · el tuyo ${money(a.price)} · el más económico ${money(cheaper[0].price)}`);
      created++;
    }
  }
  if (created > 0 && isEmailConfigured()) {
    const u = await db.execute({ sql: "SELECT display_name, username, email FROM users WHERE id = ?", args: [userId] });
    const to = u.rows[0] ? String(u.rows[0].email ?? "") : "";
    if (to) {
      const name = String(u.rows[0].display_name || u.rows[0].username);
      const mail = [
        "# Así va el ==precio== de tu par",
        "",
        `Hola ${name},`,
        "",
        created === 1 ? "Comparando con los demás vendedores de Pitsneakers, tu par va así en precio:" : "Comparando con los demás vendedores de Pitsneakers, tus pares van así en precio:",
        "",
        ...lines,
        "",
        "Que haya uno más económico en el mercado no es ningún problema: tu par sigue disponible y puede venderse. Solo queremos que lo tengas en cuenta por si quieres venderlo más rápido: puedes ajustar tu precio desde tu panel.",
        "",
        `[boton: Ver mi inventario | ${siteConfig.siteUrl.replace(/\/$/, "")}/revendedores/inventario]`,
        "",
        "**Equipo Pitsneakers**",
      ].join("\n");
      await sendEmail({ to, subject: created === 1 ? "Tu par va en el puesto " + lines[0].match(/puesto (\d+)/)?.[1] + " por precio" : "Así va el precio de tus pares", body: mail }).catch(() => undefined);
    }
  }
  return created;
}

/** Qué le falta a cada vendedor: compara los pares con VENDEDOR del catálogo contra lo que ya está en su inventario. */
export async function getSyncPlan(): Promise<SyncRow[]> {
  if (assignments.length === 0) return [];
  const db = await getDb();
  const bySeller = new Map<string, SellerAssignment[]>();
  for (const a of assignments) bySeller.set(a.seller, [...(bySeller.get(a.seller) ?? []), a]);

  // Todas las cuentas de vendedores, para encontrar por parecido las que no coinciden exacto con el usuario del catálogo.
  const accounts = (await db.execute("SELECT id, username, display_name FROM users WHERE role != 'admin'")).rows.map((r) => ({
    id: Number(r.id),
    username: String(r.username),
    display: String(r.display_name ?? ""),
  }));

  const rows: SyncRow[] = [];
  for (const [seller, list] of bySeller) {
    // El dueño puede escribir en VENDEDOR el usuario del vendedor o el correo de su cuenta.
    const u = await db.execute({
      sql: seller.includes("@")
        ? "SELECT id, display_name FROM users WHERE LOWER(email) = ? AND role != 'admin'"
        : "SELECT id, display_name FROM users WHERE username = ? AND role != 'admin'",
      args: [seller],
    });
    let userId = u.rows[0] ? Number(u.rows[0].id) : null;
    let matchedAs: string | undefined;
    let displayName = u.rows[0] ? String(u.rows[0].display_name || seller) : "";
    if (userId === null && !seller.includes("@")) {
      // Sin coincidencia exacta: se busca una única cuenta cuyo usuario (o nombre) sea el mismo ignorando puntos, guiones, espacios y mayúsculas.
      const key = loose(seller);
      const found = key ? accounts.filter((a) => loose(a.username) === key || loose(a.display) === key) : [];
      if (found.length === 1) {
        userId = found[0].id;
        matchedAs = found[0].username;
        displayName = found[0].display || found[0].username;
      }
    }
    const have = userId !== null ? await reconcile(userId, list, false) : new Map<string, number>();
    const pending: SyncPair[] = [];
    let loaded = 0;
    for (const a of list) {
      const missing = missingSizes(a, have);
      for (const size of missing) pending.push({ name: a.name, size });
      const wanted = (a.sizes.length ? [...new Set(a.sizes)] : [""]).reduce((s, size) => s + (a.counts?.[size] ?? 1), 0);
      loaded += wanted - missing.length;
    }
    rows.push({ seller, userId, displayName, pending, loaded, matchedAs });
  }
  return rows.sort((x, y) => y.pending.length - x.pending.length || x.seller.localeCompare(y.seller));
}

export interface SyncNotice {
  userId: number;
  username: string;
  items: { name: string; size: string; price: number; kind: ItemKind }[];
}

/** Carga en la cuenta de `userId` lo que le falta de sus pares asignados. Devuelve lo cargado. */
async function loadFor(userId: number, keys: string[]): Promise<{ name: string; size: string; price: number; kind: ItemKind }[]> {
  const mine = assignments.filter((a) => keys.includes(a.seller));
  if (mine.length === 0) return [];
  const have = await reconcile(userId, mine, true);
  const today = todayBogota();
  const loaded: { name: string; size: string; price: number; kind: ItemKind }[] = [];
  for (const a of mine) {
    const missing = missingSizes(a, have);
    if (missing.length === 0) continue;
    await insertItems(
      userId,
      {
        brand: a.brand,
        name: a.name,
        colorway: a.colorway,
        sku: a.sku,
        condition: a.condition,
        kind: a.kind ?? "tenis",
        cost: 0,
        extraCost: 0,
        expectedPrice: a.price,
        purchaseDate: today,
        source: "Cargado por Pitsneakers",
        notes: "",
        imageUrl: a.image,
        catalogSlug: a.slug,
      },
      missing
    );
    for (const size of missing) loaded.push({ name: a.name, size, price: a.price, kind: a.kind ?? "tenis" });
  }
  return loaded;
}

/** Carga en cada cuenta existente los pares que le faltan. Los vendedores sin cuenta se quedan esperando. */
export async function runSync(): Promise<{ added: number; sellers: number; waiting: string[]; notices: SyncNotice[] }> {
  const plan = await getSyncPlan();
  let added = 0;
  let sellers = 0;
  const waiting: string[] = [];
  const notices: SyncNotice[] = [];
  for (const row of plan) {
    if (row.userId === null) {
      if (row.pending.length) waiting.push(row.seller);
      continue;
    }
    await notifyCheaper(row.userId, [row.seller]).catch(() => 0);
    if (!row.pending.length) continue;
    const items = await loadFor(row.userId, [row.seller]);
    if (!items.length) continue;
    sellers++;
    added += items.length;
    notices.push({ userId: row.userId, username: row.seller, items });
  }
  return { added, sellers, waiting, notices };
}

/** Las "llaves" con que pueden estar asignados los pares de un vendedor en el catálogo: su usuario, su correo o un usuario parecido. */
export async function sellerKeysFor(userId: number, username: string): Promise<Set<string>> {
  // Sus pares pueden estar asignados por usuario o por el correo de su cuenta.
  const db = await getDb();
  const me = await db.execute({ sql: "SELECT email, display_name FROM users WHERE id = ?", args: [userId] });
  const email = me.rows[0] ? String(me.rows[0].email ?? "").trim().toLowerCase() : "";
  const display = me.rows[0] ? String(me.rows[0].display_name ?? "") : "";
  const keys = new Set<string>([username.trim().toLowerCase()]);
  if (email) keys.add(email);
  // Pares asignados con un usuario parecido (otro formato del mismo usuario o su nombre).
  for (const a of assignments) {
    if (a.seller.includes("@")) continue;
    const k = loose(a.seller);
    if (k && (k === loose(username) || (display && k === loose(display)))) keys.add(a.seller);
  }
  return keys;
}

/** SKU del catálogo asignados a este vendedor. */
export async function sellerSkus(userId: number, username: string): Promise<string[]> {
  const keys = await sellerKeysFor(userId, username);
  return assignments.filter((a) => keys.has(a.seller)).map((a) => a.sku);
}

/**
 * Carga en la cuenta de un vendedor los pares del catálogo que llevan su usuario y todavía no tiene.
 * Se llama sola cuando el vendedor entra a su panel, así que sus pares aparecen sin que el dueño tenga que pulsar nada.
 */
export async function syncUser(userId: number, username: string): Promise<number> {
  const keys = await sellerKeysFor(userId, username);
  await notifyCheaper(userId, [...keys]).catch(() => 0);
  const items = await loadFor(userId, [...keys]);
  if (items.length > 0) {
    const names = [...new Set(items.map((i) => i.name))];
    await createNotification(userId, {
      kind: "inventario",
      title: `${items.length === 1 ? "Se cargó" : "Se cargaron"} ${kindsPhrase(items)} en tu inventario`,
      body: names.slice(0, 3).join(", ") + (names.length > 3 ? ` y ${names.length - 3} más` : ""),
      href: "/revendedores/inventario",
    });
  }
  return items.length;
}

/** Igual que syncUser, pero una sola vez por petición (la comparten el layout y la página) y sin lanzar errores. */
export const ensureSynced = cache(async (userId: number, username: string): Promise<number> => {
  try {
    return await syncUser(userId, username);
  } catch {
    return 0;
  }
});
