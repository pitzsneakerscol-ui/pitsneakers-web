import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente mínimo de la API PRO de Skydropx (https://pro.skydropx.com/es-MX/api-docs): cotizar, comprar la guía con los
 * créditos de la cuenta, leer número de guía y etiqueta, y consultar el saldo. Solo usa Interrapidísimo.
 *
 * Variables (Vercel):
 *  - SKYDROPX_CLIENT_ID / SKYDROPX_CLIENT_SECRET: Conexiones → API en Skydropx.
 *  - SKYDROPX_API_URL (opcional): por defecto https://api-pro.skydropx.com. Para pruebas, la URL de Sandbox que muestra su documentación.
 *  - SKYDROPX_ORIGIN_TEMPLATE_ID (opcional): id de la dirección de origen guardada en Skydropx. Si falta se usa la primera que tengas.
 *  - SKYDROPX_PARCEL (opcional): "largo x ancho x alto x kilos" en cm y kg. Por defecto 35x25x15x2 (caja de tenis).
 *  - SKYDROPX_CARRIER (opcional): código de la transportadora. Por defecto interrapidisimo.
 */

const BASE = () => (process.env.SKYDROPX_API_URL ?? "").trim().replace(/\/$/, "") || "https://api-pro.skydropx.com";
export const CARRIER_CODE = () => (process.env.SKYDROPX_CARRIER ?? "").trim().toLowerCase() || "interrapidisimo";
export const CARRIER_LABEL = "Interrapidísimo";

export const isSkydropxConfigured = () =>
  Boolean((process.env.SKYDROPX_CLIENT_ID ?? "").trim() && (process.env.SKYDROPX_CLIENT_SECRET ?? "").trim());

export class SkydropxError extends Error {}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// ---------- autenticación (el token dura ~2 h; se reutiliza mientras la instancia siga viva) ----------
let cached: { token: string; until: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${BASE()}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: (process.env.SKYDROPX_CLIENT_ID ?? "").trim(),
      client_secret: (process.env.SKYDROPX_CLIENT_SECRET ?? "").trim(),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = obj(await res.json().catch(() => ({})));
  if (!res.ok || !str(data.access_token)) {
    throw new SkydropxError(res.status === 401 || res.status === 400 ? "Skydropx no aceptó las credenciales (revisa SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET)." : `Skydropx no respondió al iniciar sesión (${res.status}).`);
  }
  const ttl = num(data.expires_in) || 7200;
  cached = { token: str(data.access_token), until: Date.now() + ttl * 1000 };
  return cached.token;
}

/** Mensaje legible a partir de un error de la API (varía de forma entre endpoints). */
function apiMessage(data: Json, status: number): string {
  const errs = data.errors;
  const parts: string[] = [];
  if (Array.isArray(errs)) for (const e of errs) parts.push(typeof e === "string" ? e : str(obj(e).detail) || str(obj(e).message) || JSON.stringify(e));
  else if (errs && typeof errs === "object") for (const [k, v] of Object.entries(errs as Json)) parts.push(`${k}: ${Array.isArray(v) ? v.join(", ") : str(v) || JSON.stringify(v)}`);
  const msg = str(data.error) || str(data.message) || str(data.error_message);
  return [msg, ...parts].filter(Boolean).join(" · ").slice(0, 300) || `Skydropx respondió ${status}.`;
}

async function api(method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; data: Json }> {
  const res = await fetch(`${BASE()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const data = obj(await res.json().catch(() => ({})));
  if (res.status === 401) cached = null;
  if (!res.ok && res.status !== 202) throw new SkydropxError(apiMessage(data, res.status));
  return { status: res.status, data };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- saldo ----------
export async function getCredits(): Promise<{ balance: number; currency: string }> {
  const { data } = await api("GET", "/api/v1/finance/credits");
  const d = obj(data.data);
  return { balance: num(d.balance), currency: str(d.currency) || "COP" };
}

// ---------- origen ----------
let originCache = "";
async function originTemplateId(): Promise<string> {
  const fixed = (process.env.SKYDROPX_ORIGIN_TEMPLATE_ID ?? "").trim();
  if (fixed) return fixed;
  if (originCache) return originCache;
  const { data } = await api("GET", "/api/v1/address_templates");
  const list = Array.isArray(data.data) ? data.data : Array.isArray(data.address_templates) ? data.address_templates : [];
  const id = str(obj(list[0]).id);
  if (!id) throw new SkydropxError("No encontré una dirección de origen en Skydropx. Guarda tu dirección en Skydropx (Direcciones) o define SKYDROPX_ORIGIN_TEMPLATE_ID.");
  return (originCache = id);
}

function parcel(): { length: number; width: number; height: number; weight: number } {
  const [l, w, h, kg] = (process.env.SKYDROPX_PARCEL ?? "").toLowerCase().split("x").map((x) => num(x.trim()));
  return { length: l > 0 ? l : 35, width: w > 0 ? w : 25, height: h > 0 ? h : 15, weight: kg > 0 ? kg : 2 };
}

// ---------- webhooks ----------
/**
 * Verifica que un aviso venga de Skydropx. Su panel (Conexiones → Webhooks) permite dos formas, ambas con la clave que
 * defines en SKYDROPX_WEBHOOK_SECRET: "Authorization: HMAC <firma>" (SHA-512 en hexadecimal sobre el cuerpo exacto,
 * recomendada) o "Authorization: Bearer <clave>". Si le cambias el nombre al encabezado, ponlo en SKYDROPX_WEBHOOK_HEADER.
 */
export function webhookHeaderName(): string {
  return (process.env.SKYDROPX_WEBHOOK_HEADER ?? "").trim().toLowerCase() || "authorization";
}

export function verifyWebhook(rawBody: string, headerValue: string | null): boolean {
  const secret = (process.env.SKYDROPX_WEBHOOK_SECRET ?? "").trim();
  if (!secret || !headerValue) return false;
  const same = (a: string, b: string) => {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  };
  const v = headerValue.trim();
  if (/^hmac /i.test(v)) return same(v.slice(5).trim().toLowerCase(), createHmac("sha512", secret).update(rawBody).digest("hex"));
  if (/^bearer /i.test(v)) return same(v.slice(7).trim(), secret);
  return false;
}

// ---------- guía ----------
export interface GuideInput {
  /** valor del par: se declara a la transportadora */
  declaredValue: number;
  name: string;
  phone: string;
  email: string;
  document: string;
  department: string;
  city: string;
  postalCode: string;
  address: string;
  complement: string;
  notes: string;
  reference: string;
}

export interface Guide {
  shipmentId: string;
  /** vacío mientras la transportadora todavía no la entrega: se puede refrescar luego */
  tracking: string;
  labelUrl: string;
  cost: number;
  status: string;
  /** estado del recorrido que reporta la transportadora: created, picked_up, in_transit, last_mile, delivered… */
  trackingStatus: string;
  error: string;
}

const digits = (s: string) => s.replace(/\D/g, "");
const cut = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

/** Lee número de guía, etiqueta, costo y estado de la respuesta de un envío (formato JSON:API). */
function readShipment(raw: Json): Guide {
  const root = obj(raw.data);
  const attrs = obj(root.attributes);
  const included = Array.isArray(raw.included) ? raw.included.map(obj) : [];
  const pk = included.map((i) => obj(i.attributes)).find((a) => "label_url" in a || "tracking_number" in a) ?? {};
  const detail = obj(attrs.error_detail);
  return {
    shipmentId: str(root.id) || str(attrs.id),
    tracking: str(attrs.master_tracking_number) || str(pk.tracking_number),
    labelUrl: str(pk.label_url),
    cost: Math.round(num(attrs.total)),
    status: str(attrs.workflow_status),
    trackingStatus: str(pk.tracking_status).toLowerCase(),
    error: str(detail.error_message_detail) || str(detail.error_message) || str(detail.error_code),
  };
}

/** Consulta el estado actual de un envío ya creado (para completar la guía si tardó). */
export async function getGuide(shipmentId: string): Promise<Guide> {
  const { data } = await api("GET", `/api/v1/shipments/${encodeURIComponent(shipmentId)}`);
  return readShipment(data);
}

/**
 * Cotiza solo con la transportadora configurada, elige la tarifa más barata, verifica que alcancen los créditos
 * y compra la guía. Espera unos segundos a que salgan el número y la etiqueta; si tardan, devuelve lo que haya.
 */
export async function createGuide(g: GuideInput): Promise<Guide> {
  const carrier = CARRIER_CODE();
  const from = await originTemplateId();
  const p = parcel();
  const area3 = cut(g.complement, 60) || g.city;

  const addressTo = {
    country_code: "CO",
    postal_code: digits(g.postalCode),
    area_level1: g.department,
    area_level2: g.city,
    area_level3: area3,
  };

  const quote = await api("POST", "/api/v1/quotations", {
    quotation: {
      address_from: { address_template_id: from },
      address_to: addressTo,
      parcels: [{ length: Math.ceil(p.length), width: Math.ceil(p.width), height: Math.ceil(p.height), weight: p.weight, declared_value: g.declaredValue }],
      requested_carriers: [carrier],
    },
  });
  const quotationId = str(quote.data.id) || str(obj(quote.data.data).id);
  if (!quotationId) throw new SkydropxError("Skydropx no devolvió la cotización.");

  // Las tarifas llegan de forma asíncrona: se espera a is_completed (máx. ~25 s).
  let rates: Json[] = [];
  for (let i = 0; i < 12; i++) {
    const { data } = await api("GET", `/api/v1/quotations/${quotationId}`);
    rates = (Array.isArray(data.rates) ? data.rates : []).map(obj);
    if (data.is_completed === true) break;
    await sleep(2000);
  }
  const usable = rates
    .filter((r) => r.success !== false && str(r.provider_name).toLowerCase().includes(carrier.slice(0, 8)) && num(r.total) > 0)
    .sort((a, b) => num(a.total) - num(b.total));
  if (usable.length === 0) {
    const why = rates.flatMap((r) => (Array.isArray(r.error_messages) ? r.error_messages : [])).map((e) => str(obj(e).message) || str(e)).filter(Boolean)[0];
    throw new SkydropxError(`${CARRIER_LABEL} no cotizó este envío${why ? `: ${why}` : ". Revisa el código postal y la ciudad del cliente."}`);
  }
  const rate = usable[0];
  const price = num(rate.total);

  const credits = await getCredits().catch(() => null);
  if (credits && credits.balance < price) {
    throw new SkydropxError(`Créditos insuficientes en Skydropx: tienes ${Math.round(credits.balance).toLocaleString("es-CO")} y la guía cuesta ${Math.round(price).toLocaleString("es-CO")}. Recarga y vuelve a intentar.`);
  }

  const created = await api("POST", "/api/v1/shipments/", {
    shipment: {
      rate_id: str(rate.id),
      unique_shipment: true,
      printing_format: "standard",
      address_from: { address_template_id: from },
      address_to: {
        street1: cut(g.address, 100),
        name: cut(g.name, 30),
        company: cut(g.name, 60),
        phone: digits(g.phone).slice(-10),
        email: g.email,
        reference: cut(g.complement || g.reference, 40),
        further_information: cut(g.notes, 70),
        ...(g.document ? { tax_id_number: g.document } : {}),
      },
      packages: [{ package_number: 1, package_protected: false, declared_value: g.declaredValue }],
    },
  });
  let guide = readShipment(created.data);
  if (!guide.shipmentId) throw new SkydropxError("Skydropx no devolvió el envío creado.");

  // La guía se genera en segundo plano: se consulta hasta que traiga número (máx. ~20 s).
  for (let i = 0; i < 10 && !(guide.tracking && guide.labelUrl) && !guide.error; i++) {
    await sleep(2000);
    guide = { ...(await getGuide(guide.shipmentId)), cost: guide.cost || price };
  }
  if (!guide.cost) guide.cost = Math.round(price);
  return guide;
}
