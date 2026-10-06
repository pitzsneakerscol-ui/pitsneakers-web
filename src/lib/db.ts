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
    return client;
  })();
  cache.ready = ready;
  ready.catch(() => {
    cache.ready = undefined;
  });
  return ready;
}
