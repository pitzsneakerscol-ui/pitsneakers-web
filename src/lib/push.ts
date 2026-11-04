import "server-only";
import { createPrivateKey, createSign, sign as cryptoSign } from "node:crypto";
import { connect as h2connect, constants as h2c } from "node:http2";
import { getDb } from "@/lib/db";

/**
 * Avisos push a la app móvil. Sin librerías de Firebase:
 *  - Android: Firebase Cloud Messaging (API HTTP v1) con una cuenta de servicio.
 *  - iPhone: directo a Apple (APNs, HTTP/2) con una llave .p8. El token que registra la app en iPhone es el de APNs.
 *
 * Variables de entorno (todas opcionales: sin ellas, enviar no hace nada y devuelve ceros):
 *  FCM_SERVICE_ACCOUNT  JSON completo de la cuenta de servicio de Firebase (Configuración → Cuentas de servicio → Generar clave).
 *  APNS_KEY             contenido de la llave AuthKey_XXXX.p8 (con o sin saltos de línea reales).
 *  APNS_KEY_ID          ID de esa llave (10 caracteres).
 *  APNS_TEAM_ID         ID del equipo en Apple Developer (10 caracteres).
 *  APNS_BUNDLE_ID       (opcional) por defecto com.pitsneakers.app.
 *  APNS_SANDBOX=1       (opcional) para compilaciones de desarrollo; TestFlight y App Store usan producción.
 */

export interface PushMessage {
  title: string;
  body: string;
  /** Ruta dentro de la página que se abre al tocar el aviso (por ejemplo /pedido/PITS-XXXXXXX). */
  url?: string;
}

export interface Audience {
  all?: boolean;
  platform?: "ios" | "android";
  userIds?: number[];
  waitlistIds?: number[];
  buyerIds?: number[];
}

export interface PushResult {
  sent: number;
  failed: number;
  /** tokens que el sistema dijo que ya no existen (app desinstalada): se borran solos */
  removed: number;
}

const ZERO: PushResult = { sent: 0, failed: 0, removed: 0 };
const env = (k: string) => (process.env[k] ?? "").trim();
const pem = (s: string) => s.replace(/\\n/g, "\n");
const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/* ---------- Configuración ---------- */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function serviceAccount(): ServiceAccount | null {
  const raw = env("FCM_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    const j = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")) as ServiceAccount;
    return j.project_id && j.client_email && j.private_key ? { ...j, private_key: pem(j.private_key) } : null;
  } catch {
    return null;
  }
}

const apnsReady = () => Boolean(env("APNS_KEY") && env("APNS_KEY_ID") && env("APNS_TEAM_ID"));

export function pushStatus(): { android: boolean; ios: boolean } {
  return { android: serviceAccount() !== null, ios: apnsReady() };
}

/* ---------- Android: FCM HTTP v1 ---------- */

let fcmToken: { value: string; exp: number } | null = null;

async function fcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (fcmToken && fcmToken.exp - 60 > now) return fcmToken.value;
  const tokenUri = env("FCM_TOKEN_URL") || sa.token_uri || "https://oauth2.googleapis.com/token";
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: tokenUri, iat: now, exp: now + 3600 })
  )}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key);
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`FCM token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  fcmToken = { value: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return j.access_token;
}

type Outcome = "sent" | "failed" | "dead";

async function sendAndroid(tokens: string[], msg: PushMessage): Promise<Outcome[]> {
  const sa = serviceAccount();
  if (!sa) return tokens.map(() => "failed");
  const access = await fcmAccessToken(sa);
  const base = env("FCM_API_URL") || "https://fcm.googleapis.com";
  const out: Outcome[] = [];
  for (let i = 0; i < tokens.length; i += 20) {
    const chunk = tokens.slice(i, i + 20);
    out.push(
      ...(await Promise.all(
        chunk.map(async (token): Promise<Outcome> => {
          try {
            const res = await fetch(`${base}/v1/projects/${sa.project_id}/messages:send`, {
              method: "POST",
              headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                message: { token, notification: { title: msg.title, body: msg.body }, data: msg.url ? { url: msg.url } : {}, android: { priority: "HIGH" } },
              }),
              signal: AbortSignal.timeout(15000),
            });
            if (res.ok) return "sent";
            const j = (await res.json().catch(() => ({}))) as { error?: { status?: string } };
            return res.status === 404 || j.error?.status === "UNREGISTERED" || j.error?.status === "NOT_FOUND" ? "dead" : "failed";
          } catch {
            return "failed";
          }
        })
      ))
    );
  }
  return out;
}

/* ---------- iPhone: APNs HTTP/2 ---------- */

let apnsJwt: { value: string; at: number } | null = null;

function apnsToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (apnsJwt && now - apnsJwt.at < 40 * 60) return apnsJwt.value;
  const unsigned = `${b64url(JSON.stringify({ alg: "ES256", kid: env("APNS_KEY_ID") }))}.${b64url(JSON.stringify({ iss: env("APNS_TEAM_ID"), iat: now }))}`;
  const sig = cryptoSign("sha256", Buffer.from(unsigned), { key: createPrivateKey(pem(env("APNS_KEY"))), dsaEncoding: "ieee-p1363" });
  apnsJwt = { value: `${unsigned}.${b64url(sig)}`, at: now };
  return apnsJwt.value;
}

async function sendIos(tokens: string[], msg: PushMessage): Promise<Outcome[]> {
  if (!apnsReady()) return tokens.map(() => "failed");
  const origin = env("APNS_URL") || (env("APNS_SANDBOX") === "1" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com");
  const topic = env("APNS_BUNDLE_ID") || "com.pitsneakers.app";
  const jwt = apnsToken();
  const payload = JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body }, sound: "default" }, ...(msg.url ? { url: msg.url } : {}) });

  const session = h2connect(origin);
  session.on("error", () => undefined); // los errores de cada envío se cuentan abajo
  try {
    const sendOne = (token: string) =>
      new Promise<Outcome>((resolve) => {
        const timer = setTimeout(() => resolve("failed"), 15000);
        const done = (o: Outcome) => {
          clearTimeout(timer);
          resolve(o);
        };
        try {
          const req = session.request({
            [h2c.HTTP2_HEADER_METHOD]: "POST",
            [h2c.HTTP2_HEADER_PATH]: `/3/device/${token}`,
            authorization: `bearer ${jwt}`,
            "apns-topic": topic,
            "apns-push-type": "alert",
            "apns-priority": "10",
          });
          let status = 0;
          let data = "";
          req.on("response", (h) => (status = Number(h[":status"] ?? 0)));
          req.on("data", (c) => (data += c));
          req.on("end", () => {
            if (status === 200) return done("sent");
            let reason = "";
            try {
              reason = (JSON.parse(data) as { reason?: string }).reason ?? "";
            } catch {
              /* sin cuerpo */
            }
            done(status === 410 || reason === "BadDeviceToken" || reason === "Unregistered" ? "dead" : "failed");
          });
          req.on("error", () => done("failed"));
          req.end(payload);
        } catch {
          done("failed");
        }
      });

    const out: Outcome[] = [];
    for (let i = 0; i < tokens.length; i += 20) out.push(...(await Promise.all(tokens.slice(i, i + 20).map(sendOne))));
    return out;
  } finally {
    session.close();
  }
}

/* ---------- Envío ---------- */

const MAX_DEVICES = 5000;

async function tokensFor(a: Audience): Promise<{ token: string; platform: string }[]> {
  const db = await getDb();
  const ids = (xs?: number[]) => (xs ?? []).filter((n) => Number.isInteger(n) && n > 0);
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (!a.all) {
    const parts: string[] = [];
    for (const [col, xs] of [["user_id", a.userIds], ["waitlist_id", a.waitlistIds], ["buyer_id", a.buyerIds]] as const) {
      const list = ids(xs);
      if (list.length) {
        parts.push(`${col} IN (${list.map(() => "?").join(",")})`);
        args.push(...list);
      }
    }
    if (!parts.length) return [];
    where.push(`(${parts.join(" OR ")})`);
  }
  if (a.platform) {
    where.push("platform = ?");
    args.push(a.platform);
  }
  const r = await db.execute({ sql: `SELECT token, platform FROM devices${where.length ? ` WHERE ${where.join(" AND ")}` : ""} LIMIT ${MAX_DEVICES}`, args });
  return r.rows.map((x) => ({ token: String(x.token), platform: String(x.platform) }));
}

/** Cuántos celulares recibirían un aviso para esa audiencia (sin mandar nada). */
export async function countDevices(a: Audience): Promise<number> {
  try {
    return (await tokensFor(a)).length;
  } catch {
    return 0;
  }
}

/** Manda un aviso a una audiencia. Nunca lanza error: el aviso es un extra y no debe romper la acción que lo origina. */
export async function sendPush(audience: Audience, msg: PushMessage): Promise<PushResult> {
  const status = pushStatus();
  if (!status.android && !status.ios) return ZERO;
  const message: PushMessage = {
    title: msg.title.trim().slice(0, 80),
    body: msg.body.trim().slice(0, 180),
    // solo rutas internas: el aviso nunca puede abrir otro sitio
    url: msg.url && msg.url.startsWith("/") && !msg.url.startsWith("//") ? msg.url : undefined,
  };
  if (!message.title || !message.body) return ZERO;

  try {
    const devices = await tokensFor(audience);
    const android = devices.filter((d) => d.platform !== "ios").map((d) => d.token);
    const ios = devices.filter((d) => d.platform === "ios").map((d) => d.token);
    const [a, i] = await Promise.all([
      status.android && android.length ? sendAndroid(android, message).catch(() => android.map((): Outcome => "failed")) : Promise.resolve(android.map((): Outcome => "failed")),
      status.ios && ios.length ? sendIos(ios, message).catch(() => ios.map((): Outcome => "failed")) : Promise.resolve(ios.map((): Outcome => "failed")),
    ]);
    const tokens = [...android, ...ios];
    const outcomes = [...a, ...i];
    const dead = tokens.filter((_, n) => outcomes[n] === "dead");
    if (dead.length) {
      const db = await getDb();
      await db.batch(dead.map((t) => ({ sql: "DELETE FROM devices WHERE token = ?", args: [t] })), "write").catch(() => undefined);
    }
    return { sent: outcomes.filter((o) => o === "sent").length, failed: outcomes.filter((o) => o === "failed").length, removed: dead.length };
  } catch (e) {
    console.error("[push] no se pudo enviar:", e);
    return ZERO;
  }
}
