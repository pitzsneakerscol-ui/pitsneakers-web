import "server-only";
import { getDb } from "@/lib/db";

export type Verdict = "comprar" | "esperar" | "no";

export interface MarketQuestion {
  id: number;
  userId: number;
  sellerName: string;
  sellerEmail: string;
  model: string;
  size: string;
  buyPrice: number;
  note: string;
  status: "pendiente" | "respondida";
  verdict: Verdict | "";
  answer: string;
  createdAt: number;
  answeredAt: number | null;
}

const SELECT = `SELECT q.*, u.display_name AS seller_display, u.username AS seller_username, u.email AS seller_email
  FROM market_questions q JOIN users u ON u.id = q.user_id`;

function row(r: Record<string, unknown>): MarketQuestion {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    sellerName: String(r.seller_display || r.seller_username),
    sellerEmail: String(r.seller_email ?? ""),
    model: String(r.model),
    size: String(r.size),
    buyPrice: Number(r.buy_price),
    note: String(r.note),
    status: r.status === "respondida" ? "respondida" : "pendiente",
    verdict: (["comprar", "esperar", "no"].includes(String(r.verdict)) ? String(r.verdict) : "") as Verdict | "",
    answer: String(r.answer),
    createdAt: Number(r.created_at),
    answeredAt: r.answered_at === null || r.answered_at === undefined ? null : Number(r.answered_at),
  };
}

export async function createQuestion(
  userId: number,
  data: { model: string; size: string; buyPrice: number; note: string }
): Promise<number> {
  const db = await getDb();
  const res = await db.execute({
    sql: "INSERT INTO market_questions (user_id, model, size, buy_price, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [userId, data.model, data.size, data.buyPrice, data.note, Date.now()],
  });
  return Number(res.lastInsertRowid);
}

export async function listQuestions(userId: number, limit = 50): Promise<MarketQuestion[]> {
  const db = await getDb();
  const r = await db.execute({ sql: `${SELECT} WHERE q.user_id = ? ORDER BY q.created_at DESC, q.id DESC LIMIT ?`, args: [userId, limit] });
  return r.rows.map((x) => row(x as unknown as Record<string, unknown>));
}

export async function listAllQuestions(filter: "pendiente" | "respondida" | "todas" = "todas", limit = 200): Promise<MarketQuestion[]> {
  const db = await getDb();
  const where = filter === "todas" ? "" : "WHERE q.status = ?";
  const r = await db.execute({
    sql: `${SELECT} ${where} ORDER BY (q.status = 'pendiente') DESC, q.created_at DESC LIMIT ${Math.min(limit, 500)}`,
    args: filter === "todas" ? [] : [filter],
  });
  return r.rows.map((x) => row(x as unknown as Record<string, unknown>));
}

export async function getQuestion(id: number): Promise<MarketQuestion | null> {
  const db = await getDb();
  const r = await db.execute({ sql: `${SELECT} WHERE q.id = ?`, args: [id] });
  return r.rows[0] ? row(r.rows[0] as unknown as Record<string, unknown>) : null;
}

export async function pendingQuestionCount(): Promise<number> {
  try {
    const db = await getDb();
    const r = await db.execute("SELECT COUNT(*) AS n FROM market_questions WHERE status = 'pendiente'");
    return Number(r.rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function saveAnswer(id: number, verdict: Verdict, answer: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: "UPDATE market_questions SET status = 'respondida', verdict = ?, answer = ?, answered_at = ? WHERE id = ?",
    args: [verdict, answer, Date.now(), id],
  });
  return res.rowsAffected > 0;
}
