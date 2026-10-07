import "server-only";
import type { Row } from "@libsql/client";
import { getDb } from "@/lib/db";
import { todayBogota, type Item } from "@/lib/reseller-shared";
import { DEFAULT_TEMPLATES, TEMPLATE_VERSION, type TemplateData } from "@/lib/email-templates";

/* ---------- Tipos ---------- */

export interface ResellerRow {
  id: number;
  username: string;
  displayName: string;
  whatsapp: string;
  email: string;
  suspended: boolean;
  createdAt: number;
  lastLogin: number | null;
  stockCount: number;
  soldCount: number;
  invested: number;
  expectedValue: number;
  revenue: number;
  profit: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  notes: string;
  createdAt: number;
}

export type PaymentStatus = "pendiente" | "pagado" | "cancelado";
export type PartyType = "customer" | "reseller";

export interface Payment {
  id: number;
  partyType: PartyType;
  partyId: number;
  partyName: string;
  partyEmail: string;
  concept: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paidDate: string;
  method: string;
  notes: string;
  createdAt: number;
  overdue: boolean;
}

export interface EmailLogRow {
  id: number;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  template: string;
  status: "enviado" | "fallido" | "no_configurado";
  error: string;
  createdAt: number;
}

export const PAYMENT_METHODS = ["Efectivo", "Nequi", "Daviplata", "Bancolombia", "Transferencia", "Otro"];

const n = (v: unknown) => Number(v ?? 0);

/* ---------- Revendedores ---------- */

const RESELLER_SQL = `
  SELECT u.id, u.username, u.display_name, u.whatsapp, u.email, u.suspended, u.created_at, u.last_login,
    COALESCE(SUM(CASE WHEN i.status IN ('stock','reservado') THEN 1 ELSE 0 END), 0) AS stock_count,
    COALESCE(SUM(CASE WHEN i.status = 'vendido' THEN 1 ELSE 0 END), 0) AS sold_count,
    COALESCE(SUM(CASE WHEN i.status IN ('stock','reservado') THEN i.cost + i.extra_cost ELSE 0 END), 0) AS invested,
    COALESCE(SUM(CASE WHEN i.status IN ('stock','reservado') THEN i.expected_price ELSE 0 END), 0) AS expected_value,
    COALESCE(SUM(CASE WHEN i.status = 'vendido' THEN COALESCE(i.sold_price, 0) ELSE 0 END), 0) AS revenue,
    COALESCE(SUM(CASE WHEN i.status = 'vendido' THEN COALESCE(i.sold_price, 0) - i.cost - i.extra_cost - i.sale_fees ELSE 0 END), 0) AS profit
  FROM users u LEFT JOIN items i ON i.user_id = u.id
  WHERE u.role != 'admin'`;

function rowToReseller(r: Row): ResellerRow {
  return {
    id: n(r.id),
    username: String(r.username),
    displayName: String(r.display_name),
    whatsapp: String(r.whatsapp),
    email: String(r.email),
    suspended: n(r.suspended) === 1,
    createdAt: n(r.created_at),
    lastLogin: r.last_login === null ? null : n(r.last_login),
    stockCount: n(r.stock_count),
    soldCount: n(r.sold_count),
    invested: n(r.invested),
    expectedValue: n(r.expected_value),
    revenue: n(r.revenue),
    profit: n(r.profit),
  };
}

export async function listResellers(): Promise<ResellerRow[]> {
  const db = await getDb();
  const res = await db.execute(`${RESELLER_SQL} GROUP BY u.id ORDER BY u.created_at DESC`);
  return res.rows.map(rowToReseller);
}

export async function getReseller(id: number): Promise<ResellerRow | null> {
  const db = await getDb();
  const res = await db.execute({ sql: `${RESELLER_SQL} AND u.id = ? GROUP BY u.id`, args: [id] });
  return res.rows[0] ? rowToReseller(res.rows[0]) : null;
}

/** Ítems con el nombre del dueño, para la vista global del administrador. */
export interface AdminItem extends Item {
  ownerId: number;
  ownerName: string;
}

export async function listAllItems(filters: {
  q?: string;
  status?: string;
  userId?: number;
  soldMonth?: string;
  limit?: number;
}): Promise<AdminItem[]> {
  const db = await getDb();
  const where: string[] = ["u.role != 'admin'"];
  const args: (string | number)[] = [];
  if (filters.status === "vendido") where.push("i.status = 'vendido'");
  else if (filters.status === "stock" || filters.status === "reservado") {
    where.push("i.status = ?");
    args.push(filters.status);
  } else if (filters.status === "activos") where.push("i.status != 'vendido'");
  if (filters.userId) {
    where.push("i.user_id = ?");
    args.push(filters.userId);
  }
  if (filters.soldMonth) {
    where.push("i.sold_date LIKE ?");
    args.push(`${filters.soldMonth}%`);
  }
  if (filters.q) {
    where.push(
      "(i.brand || ' ' || i.name || ' ' || i.colorway || ' ' || i.size || ' ' || u.username || ' ' || u.display_name) LIKE ? ESCAPE '\\'"
    );
    args.push(`%${filters.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  const res = await db.execute({
    sql: `SELECT i.*, u.username AS owner_username, u.display_name AS owner_display
          FROM items i JOIN users u ON u.id = i.user_id
          WHERE ${where.join(" AND ")}
          ORDER BY ${filters.status === "vendido" ? "i.sold_date DESC," : ""} i.created_at DESC, i.id DESC
          LIMIT ${Math.min(filters.limit ?? 300, 1000)}`,
    args,
  });
  return res.rows.map((r) => ({
    id: n(r.id),
    brand: String(r.brand),
    name: String(r.name),
    colorway: String(r.colorway),
    sku: String(r.sku),
    size: String(r.size),
    condition: r.condition === "usado" ? "usado" : "nuevo",
    cost: n(r.cost),
    extraCost: n(r.extra_cost),
    expectedPrice: n(r.expected_price),
    status: (["stock", "reservado", "vendido"].includes(String(r.status)) ? String(r.status) : "stock") as Item["status"],
    purchaseDate: String(r.purchase_date),
    source: String(r.source),
    notes: String(r.notes),
    imageUrl: String(r.image_url),
    catalogSlug: String(r.catalog_slug),
    soldPrice: r.sold_price === null ? null : n(r.sold_price),
    soldDate: r.sold_date === null ? null : String(r.sold_date),
    soldChannel: String(r.sold_channel),
    saleFees: n(r.sale_fees),
    buyer: String(r.buyer),
    createdAt: n(r.created_at),
    ownerId: n(r.user_id),
    ownerName: String(r.owner_display || r.owner_username),
  }));
}

/* ---------- Compradores ---------- */

const rowToCustomer = (r: Row): Customer => ({
  id: n(r.id),
  name: String(r.name),
  email: String(r.email),
  whatsapp: String(r.whatsapp),
  notes: String(r.notes),
  createdAt: n(r.created_at),
});

export async function listCustomers(): Promise<Customer[]> {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM customers ORDER BY name COLLATE NOCASE");
  return res.rows.map(rowToCustomer);
}

/* ---------- Pagos ---------- */

const PAYMENT_SQL = `
  SELECT p.*,
    CASE p.party_type
      WHEN 'customer' THEN (SELECT name FROM customers WHERE id = p.party_id)
      ELSE (SELECT COALESCE(NULLIF(display_name, ''), username) FROM users WHERE id = p.party_id)
    END AS party_name,
    CASE p.party_type
      WHEN 'customer' THEN (SELECT email FROM customers WHERE id = p.party_id)
      ELSE (SELECT email FROM users WHERE id = p.party_id)
    END AS party_email
  FROM payments p`;

function rowToPayment(r: Row, today: string): Payment {
  const status = (["pendiente", "pagado", "cancelado"].includes(String(r.status)) ? String(r.status) : "pendiente") as PaymentStatus;
  const dueDate = String(r.due_date);
  return {
    id: n(r.id),
    partyType: r.party_type === "reseller" ? "reseller" : "customer",
    partyId: n(r.party_id),
    partyName: String(r.party_name ?? "(eliminado)"),
    partyEmail: String(r.party_email ?? ""),
    concept: String(r.concept),
    amount: n(r.amount),
    dueDate,
    status,
    paidDate: String(r.paid_date),
    method: String(r.method),
    notes: String(r.notes),
    createdAt: n(r.created_at),
    overdue: status === "pendiente" && dueDate !== "" && dueDate < today,
  };
}

export async function listPayments(filter: "todos" | "pendiente" | "vencido" | "pagado" | "cancelado" = "todos"): Promise<Payment[]> {
  const db = await getDb();
  const today = todayBogota();
  const where: string[] = [];
  const args: string[] = [];
  if (filter === "vencido") {
    where.push("p.status = 'pendiente' AND p.due_date != '' AND p.due_date < ?");
    args.push(today);
  } else if (filter !== "todos") {
    where.push("p.status = ?");
    args.push(filter);
  }
  const res = await db.execute({
    sql: `${PAYMENT_SQL} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY (p.status = 'pendiente') DESC, CASE WHEN p.due_date = '' THEN '9999' ELSE p.due_date END ASC, p.id DESC
          LIMIT 500`,
    args,
  });
  return res.rows.map((r) => rowToPayment(r, today));
}

export async function getPayment(id: number): Promise<Payment | null> {
  const db = await getDb();
  const res = await db.execute({ sql: `${PAYMENT_SQL} WHERE p.id = ?`, args: [id] });
  return res.rows[0] ? rowToPayment(res.rows[0], todayBogota()) : null;
}

/* ---------- Resumen ---------- */

export interface Overview {
  generatedAt: number;
  resellers: number;
  activeResellers30d: number;
  suspended: number;
  stockPairs: number;
  invested: number;
  expectedValue: number;
  soldMonthCount: number;
  soldMonthRevenue: number;
  soldMonthProfit: number;
  pendingCount: number;
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  collectedMonth: number;
  customers: number;
  emailsMonth: number;
  emailsFailedMonth: number;
}

export async function getOverview(): Promise<Overview> {
  const db = await getDb();
  const today = todayBogota();
  const month = today.slice(0, 7);
  const monthStart = new Date(`${month}-01T00:00:00-05:00`).getTime();
  const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const [people, sales, pay, over, paid, cust, mail] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN last_login >= ? THEN 1 ELSE 0 END), 0) AS active,
              COALESCE(SUM(suspended), 0) AS suspended
            FROM users WHERE role != 'admin'`,
      args: [since30],
    }),
    db.execute({
      sql: `SELECT
              COALESCE(SUM(CASE WHEN i.status IN ('stock','reservado') THEN 1 ELSE 0 END), 0) AS stock_pairs,
              COALESCE(SUM(CASE WHEN i.status IN ('stock','reservado') THEN i.cost + i.extra_cost ELSE 0 END), 0) AS invested,
              COALESCE(SUM(CASE WHEN i.status IN ('stock','reservado') THEN i.expected_price ELSE 0 END), 0) AS expected,
              COALESCE(SUM(CASE WHEN i.status = 'vendido' AND i.sold_date LIKE ? THEN 1 ELSE 0 END), 0) AS sold_n,
              COALESCE(SUM(CASE WHEN i.status = 'vendido' AND i.sold_date LIKE ? THEN COALESCE(i.sold_price, 0) ELSE 0 END), 0) AS sold_rev,
              COALESCE(SUM(CASE WHEN i.status = 'vendido' AND i.sold_date LIKE ? THEN COALESCE(i.sold_price, 0) - i.cost - i.extra_cost - i.sale_fees ELSE 0 END), 0) AS sold_profit
            FROM items i JOIN users u ON u.id = i.user_id WHERE u.role != 'admin'`,
      args: [`${month}%`, `${month}%`, `${month}%`],
    }),
    db.execute("SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS s FROM payments WHERE status = 'pendiente'"),
    db.execute({
      sql: "SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS s FROM payments WHERE status = 'pendiente' AND due_date != '' AND due_date < ?",
      args: [today],
    }),
    db.execute({
      sql: "SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE status = 'pagado' AND paid_date LIKE ?",
      args: [`${month}%`],
    }),
    db.execute("SELECT COUNT(*) AS c FROM customers"),
    db.execute({
      sql: `SELECT COUNT(*) AS c, COALESCE(SUM(CASE WHEN status = 'fallido' THEN 1 ELSE 0 END), 0) AS f
            FROM email_log WHERE created_at >= ?`,
      args: [monthStart],
    }),
  ]);
  const p = people.rows[0];
  const s = sales.rows[0];
  return {
    generatedAt: Date.now(),
    resellers: n(p.total),
    activeResellers30d: n(p.active),
    suspended: n(p.suspended),
    stockPairs: n(s.stock_pairs),
    invested: n(s.invested),
    expectedValue: n(s.expected),
    soldMonthCount: n(s.sold_n),
    soldMonthRevenue: n(s.sold_rev),
    soldMonthProfit: n(s.sold_profit),
    pendingCount: n(pay.rows[0].c),
    pendingAmount: n(pay.rows[0].s),
    overdueCount: n(over.rows[0].c),
    overdueAmount: n(over.rows[0].s),
    collectedMonth: n(paid.rows[0].s),
    customers: n(cust.rows[0].c),
    emailsMonth: n(mail.rows[0].c),
    emailsFailedMonth: n(mail.rows[0].f),
  };
}

/* ---------- Plantillas ---------- */

let seeded = false;

export async function listTemplates(): Promise<TemplateData[]> {
  const db = await getDb();
  if (!seeded) {
    await db.batch(
      DEFAULT_TEMPLATES.map((t) => ({
        // Las incluidas se actualizan solas cuando cambia TEMPLATE_VERSION, salvo que las hayas editado.
        sql: `INSERT INTO email_templates (key, name, subject, body, builtin, updated_at, tpl_version)
              VALUES (?, ?, ?, ?, 1, ?, ?)
              ON CONFLICT(key) DO UPDATE SET name = excluded.name, subject = excluded.subject,
                body = excluded.body, updated_at = excluded.updated_at, tpl_version = excluded.tpl_version
              WHERE email_templates.builtin = 1 AND email_templates.tpl_version < excluded.tpl_version`,
        args: [t.key, t.name, t.subject, t.body, Date.now(), TEMPLATE_VERSION],
      })),
      "write"
    );
    seeded = true;
  }
  const res = await db.execute("SELECT * FROM email_templates ORDER BY builtin DESC, name COLLATE NOCASE");
  // Las plantillas originales mantienen el orden con el que se definieron.
  const order = new Map(DEFAULT_TEMPLATES.map((t, i) => [t.key, i]));
  return res.rows
    .map((r) => ({
      key: String(r.key),
      name: String(r.name),
      subject: String(r.subject),
      body: String(r.body),
      builtin: n(r.builtin) === 1,
    }))
    .sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999));
}

/* ---------- Historial de correos ---------- */

export async function listEmailLog(limit = 100): Promise<EmailLogRow[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM email_log ORDER BY created_at DESC, id DESC LIMIT ?",
    args: [limit],
  });
  return res.rows.map((r) => ({
    id: n(r.id),
    toEmail: String(r.to_email),
    toName: String(r.to_name),
    subject: String(r.subject),
    body: String(r.body),
    template: String(r.template),
    status: String(r.status) as EmailLogRow["status"],
    error: String(r.error),
    createdAt: n(r.created_at),
  }));
}
