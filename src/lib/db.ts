import "server-only";
import { mkdirSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";

// Producción: define DATABASE_URL (y DATABASE_AUTH_TOKEN si es Turso).
// Desarrollo: sin variables, usa un archivo SQLite local en .data/.
const DEV_URL = "file:.data/revendedores.db";

/** Lee una variable de entorno quitando espacios, saltos de línea y comillas que a veces se pegan sin querer. */
function envValue(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

function resolveUrl(): string {
  const url = envValue("DATABASE_URL");
  if (url) return url;
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
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    href TEXT NOT NULL DEFAULT '',
    read_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at)`,
  `CREATE TABLE IF NOT EXISTS market_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    model TEXT NOT NULL,
    size TEXT NOT NULL DEFAULT '',
    buy_price INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pendiente',
    verdict TEXT NOT NULL DEFAULT '',
    answer TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    answered_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_market_questions ON market_questions(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)`,
  `CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    size TEXT NOT NULL DEFAULT '',
    amount INTEGER NOT NULL,
    valid_until TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pendiente',
    counter_amount INTEGER NOT NULL DEFAULT 0,
    response_note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    responded_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_offers_user ON offers(user_id, status, created_at)`,
  `CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    code TEXT NOT NULL UNIQUE,
    welcomed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    published INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    condition TEXT NOT NULL DEFAULT 'nuevo',
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    start_price INTEGER NOT NULL,
    min_increment INTEGER NOT NULL DEFAULT 20000,
    current_bid INTEGER NOT NULL DEFAULT 0,
    bid_count INTEGER NOT NULL DEFAULT 0,
    leader_id INTEGER,
    ends_at INTEGER NOT NULL,
    winner_notified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auction_items ON auction_items(auction_id, position)`,
  `CREATE TABLE IF NOT EXISTS auction_bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    bidder_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auction_bids ON auction_bids(item_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS catalog_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    condition TEXT NOT NULL DEFAULT 'nuevo',
    image TEXT NOT NULL DEFAULT '',
    amount INTEGER NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    buyer_city TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pendiente',
    wompi_id TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL DEFAULT '',
    emailed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    paid_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_catalog_orders ON catalog_orders(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS trivia_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    starts_at INTEGER NOT NULL,
    seconds INTEGER NOT NULL DEFAULT 15,
    gap INTEGER NOT NULL DEFAULT 6,
    prize INTEGER NOT NULL DEFAULT 10000,
    max_winners INTEGER NOT NULL DEFAULT 10,
    min_correct INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 0,
    finalized INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS trivia_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    options TEXT NOT NULL,
    correct INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_trivia_questions ON trivia_questions(game_id, position)`,
  `CREATE TABLE IF NOT EXISTS trivia_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    waitlist_id INTEGER NOT NULL,
    choice INTEGER NOT NULL,
    correct INTEGER NOT NULL,
    ms INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(question_id, waitlist_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_trivia_answers ON trivia_answers(game_id, waitlist_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_trivia_start ON trivia_games(starts_at)`,
  `CREATE TABLE IF NOT EXISTS devices (
    token TEXT PRIMARY KEY,
    platform TEXT NOT NULL DEFAULT 'android',
    user_id INTEGER,
    waitlist_id INTEGER,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS credit_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL,
    waitlist_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL DEFAULT 0,
    reserved_ref TEXT NOT NULL DEFAULT '',
    reserved_at INTEGER,
    used_ref TEXT NOT NULL DEFAULT '',
    used_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bidder_sessions (
    token_hash TEXT PRIMARY KEY,
    waitlist_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  // Cuentas de compradores (distintas de las de revendedores).
  `CREATE TABLE IF NOT EXISTS buyers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    google_sub TEXT NOT NULL DEFAULT '',
    verified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_login INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS buyer_sessions (
    token_hash TEXT PRIMARY KEY,
    buyer_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_buyer_sessions ON buyer_sessions(buyer_id)`,
  `CREATE TABLE IF NOT EXISTS buyer_tokens (
    token_hash TEXT PRIMARY KEY,
    buyer_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS buyer_favorites (
    buyer_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (buyer_id, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS buyer_collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    paid INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_buyer_collection ON buyer_collection(buyer_id)`,
  `CREATE TABLE IF NOT EXISTS buyer_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    list_price INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente',
    counter_amount INTEGER NOT NULL DEFAULT 0,
    response_note TEXT NOT NULL DEFAULT '',
    agreed_amount INTEGER NOT NULL DEFAULT 0,
    order_ref TEXT NOT NULL DEFAULT '',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    responded_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_buyer_offers ON buyer_offers(buyer_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_buyer_offers_status ON buyer_offers(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    rating INTEGER NOT NULL,
    text TEXT NOT NULL,
    product TEXT NOT NULL DEFAULT '',
    photo TEXT NOT NULL DEFAULT '',
    photo_type TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status, created_at)`,
];

// Columnas agregadas después de la primera versión de cada tabla.
const ADDED_COLUMNS: Record<string, [string, string][]> = {
  reviews: [["vip", "INTEGER NOT NULL DEFAULT 0"]],
  waitlist: [
    ["announced", "INTEGER NOT NULL DEFAULT 0"],
    ["trivia_announced", "INTEGER NOT NULL DEFAULT 0"],
    // Id de la subasta cuyo recordatorio de cierre ya recibió (0 = ninguno).
    ["auction_reminded", "INTEGER NOT NULL DEFAULT 0"],
  ],
  trivia_questions: [["bank_key", "TEXT NOT NULL DEFAULT ''"]],
  catalog_orders: [
    ["credit_code", "TEXT NOT NULL DEFAULT ''"],
    ["discount", "INTEGER NOT NULL DEFAULT 0"],
    ["fee", "INTEGER NOT NULL DEFAULT 0"],
    ["ship_department", "TEXT NOT NULL DEFAULT ''"],
    ["ship_address", "TEXT NOT NULL DEFAULT ''"],
    ["ship_complement", "TEXT NOT NULL DEFAULT ''"],
    ["ship_document", "TEXT NOT NULL DEFAULT ''"],
    ["ship_notes", "TEXT NOT NULL DEFAULT ''"],
  ],
  users: [
    ["email", "TEXT NOT NULL DEFAULT ''"],
    ["role", "TEXT NOT NULL DEFAULT 'revendedor'"],
    ["suspended", "INTEGER NOT NULL DEFAULT 0"],
    ["last_login", "INTEGER"],
  ],
  email_templates: [["tpl_version", "INTEGER NOT NULL DEFAULT 0"]],
  items: [["kind", "TEXT NOT NULL DEFAULT 'tenis'"]],
  buyer_offers: [
    ["pay_hours", "INTEGER NOT NULL DEFAULT 24"],
    ["priority", "INTEGER NOT NULL DEFAULT 0"],
    ["league", "TEXT NOT NULL DEFAULT ''"],
  ],
};

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
      authToken: envValue("DATABASE_AUTH_TOKEN") || undefined,
    });
    await client.batch(SCHEMA, "write");
    for (const [table, cols] of Object.entries(ADDED_COLUMNS)) {
      const info = await client.execute(`PRAGMA table_info(${table})`);
      const have = new Set(info.rows.map((r) => String(r.name)));
      for (const [col, def] of cols) {
        if (!have.has(col)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      }
    }
    return client;
  })();
  cache.ready = ready;
  ready.catch(() => {
    cache.ready = undefined;
  });
  return ready;
}
