"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { formatPrice } from "@/lib/format";
import { isValidDate, SALE_CHANNELS, todayBogota } from "@/lib/reseller-shared";
import { digits, findStock, parseDate, type GridStock } from "@/lib/sales-match";

export interface SaleRowIn {
  userId: number;
  /** par elegido de la lista del revendedor (si lo hay) */
  itemId?: number;
  name: string;
  size: string;
  price: string;
  cost: string;
  fees: string;
  date: string;
  buyer: string;
  channel: string;
}

export interface SaleResult {
  ok: boolean;
  error?: string;
  /** "inventario" = salió de su stock · "nuevo" = se creó ya vendido */
  mode?: "inventario" | "nuevo";
}

const MAX_ROWS = 300;
const SOURCE = "Registrado por Pitsneakers";

/**
 * Registra ventas a nombre de los revendedores (como una hoja de cálculo).
 * Cada fila vende un par de su inventario (por elección o por nombre y talla) o, si no está, lo crea ya vendido.
 * Les aparece en su panel de Ventas y reciben un aviso.
 */
export async function saveSales(rows: SaleRowIn[]): Promise<SaleResult[]> {
  await requireAdmin();
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (rows.length > MAX_ROWS) return rows.map(() => ({ ok: false, error: `Máximo ${MAX_ROWS} ventas por envío.` }));

  const db = await getDb();
  const today = todayBogota();
  const users = await db.execute("SELECT id FROM users WHERE role != 'admin'");
  const validUsers = new Set(users.rows.map((r) => Number(r.id)));
  const stockRes = await db.execute("SELECT id, user_id, name, colorway, size, expected_price, cost FROM items WHERE status != 'vendido'");
  const stock: GridStock[] = stockRes.rows.map((r) => ({
    id: Number(r.id),
    userId: Number(r.user_id),
    label: [String(r.name), String(r.colorway)].filter(Boolean).join(" "),
    size: String(r.size),
    expectedPrice: Number(r.expected_price),
    cost: Number(r.cost),
  }));
  const taken = new Set<number>();

  const results: SaleResult[] = [];
  const perUser = new Map<number, { n: number; total: number; names: string[] }>();

  for (const row of rows) {
    try {
      if (!validUsers.has(Number(row.userId))) { results.push({ ok: false, error: "Elige un revendedor válido." }); continue; }
      const name = String(row.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
      const size = String(row.size ?? "").trim().slice(0, 20);
      const price = digits(String(row.price ?? ""));
      const cost = digits(String(row.cost ?? ""));
      const fees = digits(String(row.fees ?? ""));
      const date = parseDate(String(row.date ?? ""), today);
      const buyer = String(row.buyer ?? "").trim().slice(0, 80);
      const channel = (SALE_CHANNELS as readonly string[]).includes(row.channel) ? row.channel : "";
      if (!name) { results.push({ ok: false, error: "Falta el par." }); continue; }
      if (price <= 0) { results.push({ ok: false, error: "Falta el precio de venta." }); continue; }
      if (!isValidDate(date)) { results.push({ ok: false, error: "Fecha no válida (usa 25/10/2026 o 2026-10-25)." }); continue; }

      const userId = Number(row.userId);
      // 1) el par elegido  2) por nombre y talla en su inventario (sin repetir uno ya usado en este envío)
      const free = stock.filter((s) => !taken.has(s.id));
      const chosen = row.itemId ? free.find((s) => s.id === Number(row.itemId) && s.userId === userId) : undefined;
      const match = chosen ?? findStock(free, userId, name, size);

      if (match) {
        taken.add(match.id);
        await db.execute({
          sql: `UPDATE items SET status='vendido', sold_price=?, sold_date=?, sold_channel=?, sale_fees=?, buyer=?, cost = CASE WHEN ? > 0 THEN ? ELSE cost END
                WHERE id=? AND user_id=? AND status != 'vendido'`,
          args: [price, date, channel, fees, buyer, cost, cost, match.id, userId],
        });
        results.push({ ok: true, mode: "inventario" });
        const u = perUser.get(userId) ?? { n: 0, total: 0, names: [] };
        u.n++; u.total += price; u.names.push(match.label);
        perUser.set(userId, u);
      } else {
        await db.execute({
          sql: `INSERT INTO items (user_id, name, size, condition, cost, expected_price, status, purchase_date, source, sold_price, sold_date, sold_channel, sale_fees, buyer, created_at)
                VALUES (?, ?, ?, 'nuevo', ?, ?, 'vendido', ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [userId, name, size, cost, price, date, SOURCE, price, date, channel, fees, buyer, Date.now()],
        });
        results.push({ ok: true, mode: "nuevo" });
        const u = perUser.get(userId) ?? { n: 0, total: 0, names: [] };
        u.n++; u.total += price; u.names.push(name);
        perUser.set(userId, u);
      }
    } catch (e) {
      console.error("[ventas] fila falló:", e);
      results.push({ ok: false, error: "No se pudo guardar esta fila." });
    }
  }

  for (const [userId, u] of perUser) {
    const names = [...new Set(u.names)];
    await createNotification(userId, {
      kind: "inventario",
      title: u.n === 1 ? `Se registró 1 venta: ${formatPrice(u.total)}` : `Se registraron ${u.n} ventas: ${formatPrice(u.total)}`,
      body: names.slice(0, 3).join(", ") + (names.length > 3 ? ` y ${names.length - 3} más` : ""),
      href: "/revendedores/ventas",
    });
  }
  revalidatePath("/admin", "layout");
  return results;
}

/** Deshace una venta: si la creó el administrador se borra; si salía del inventario del vendedor, el par vuelve a su stock. */
export async function undoSale(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  if (!id) return;
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT source FROM items WHERE id = ? AND status = 'vendido'", args: [id] });
  if (!r.rows[0]) return;
  if (String(r.rows[0].source) === SOURCE) {
    await db.execute({ sql: "DELETE FROM items WHERE id = ?", args: [id] });
  } else {
    await db.execute({ sql: "UPDATE items SET status='stock', sold_price=NULL, sold_date=NULL, sold_channel='', sale_fees=0, buyer='' WHERE id = ?", args: [id] });
  }
  revalidatePath("/admin", "layout");
}
