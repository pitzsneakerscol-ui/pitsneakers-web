import "server-only";
import { mkdirSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";

// Producción: define DATABASE_URL (y DATABASE_AUTH_TOKEN si es Turso).
// Desarrollo: sin variables, usa un archivo SQLite local en .data/.
const DEV_URL = "file:.data/revendedores.db";

function resolveUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return process.env.NODE_ENV === "production" ? "" : DEV_URL;
}

export function isDbConfigured(): boolean {
  return resolveUrl() !== "";
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    colorway TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    condition TEXT NOT NULL DEFAULT 'nuevo',
    cost INTEGER NOT NULL DEFAULT 0,
    extra_cost INTEGER NOT NULL DEFAULT 0,
    expected_price INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'stock',
    purchase_date TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    catalog_slug TEXT NOT NULL DEFAULT '',
    sold_price INTEGER,
    sold_date TEXT,
    sold_channel TEXT NOT NULL DEFAULT '',
    sale_fees INTEGER NOT NULL DEFAULT 0,
    buyer TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_id, status)`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_type TEXT NOT NULL,
    party_id INTEGER NOT NULL,
    concept TEXT NOT NULL,
    amount INTEGER NOT NULL,
    due_date TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pendiente',
    paid_date TEXT NOT NULL DEFAULT '',
    method TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, due_date)`,
  `CREATE TABLE IF NOT EXISTS email_templates (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    builtin INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_email TEXT NOT NULL,
    to_name TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    template TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    error TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at)`,
];

// Columnas agregadas después de la primera versión de `users`.
const USER_COLUMNS: [string, string][] = [
  ["email", "TEXT NOT NULL DEFAULT ''"],
  ["role", "TEXT NOT NULL DEFAULT 'revendedor'"],
  ["suspended", "INTEGER NOT NULL DEFAULT 0"],
  ["last_login", "INTEGER"],
];

type Cache = { ready?: Promise<Client> };
const g = globalThis as unknown as { __rvDb?: Cache };
const cache: Cache = (g.__rvDb ??= {});

export async function getDb(): Promise<Client> {
  if (cache.ready) return cache.ready;
  const url = resolveUrl();
  if (!url) throw new Error("DATABASE_URL no esta configurada.");
  const ready = (async () => {
    if (url.startsWith("file:")) mkdirSync(".data", { recursive: true });
    const client = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    });
    await client.batch(SCHEMA, "write");
    const info = await client.execute("PRAGMA table_info(users)");
    const have = new Set(info.rows.map((r) => String(r.name)));
    for (const [col, def] of USER_COLUMNS) {
      if (!have.has(col)) await client.execute(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
    }
    return client;
  })();
  cache.ready = ready;
  ready.catch(() => {
    cache.ready = undefined;
  });
  return ready;
}
