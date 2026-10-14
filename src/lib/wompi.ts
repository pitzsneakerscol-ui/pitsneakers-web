import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { siteConfig } from "@/config/site";

// Wompi (https://docs.wompi.co). Variables de entorno en Vercel:
//   WOMPI_PUBLIC_KEY        — llave pública (pub_test_… en pruebas, pub_prod_… en producción)
//   WOMPI_INTEGRITY_SECRET  — secreto de integridad (test_integrity_… / prod_integrity_…)
//   WOMPI_EVENTS_SECRET     — secreto de eventos (test_events_… / prod_events_…)
// Las pruebas y la producción usan las mismas direcciones: lo que cambia son las llaves.

const CHECKOUT_URL = "https://checkout.wompi.co/p/";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export function isWompiConfigured(): boolean {
  return Boolean(process.env.WOMPI_PUBLIC_KEY && process.env.WOMPI_INTEGRITY_SECRET && process.env.WOMPI_EVENTS_SECRET);
}

/** true cuando las llaves son de pruebas (se avisa en pantalla y en el panel). */
export function isWompiTest(): boolean {
  return (process.env.WOMPI_PUBLIC_KEY ?? "").startsWith("pub_test_");
}

/** Dirección del pago en Wompi. El monto va en centavos y la firma se calcula aquí, en el servidor. */
export function buildCheckoutUrl(opts: {
  reference: string;
  amountCop: number;
  email: string;
  name: string;
  phone: string;
}): string {
  const cents = Math.round(opts.amountCop * 100);
  const secret = process.env.WOMPI_INTEGRITY_SECRET ?? "";
  const params = new URLSearchParams({
    "public-key": process.env.WOMPI_PUBLIC_KEY ?? "",
    currency: "COP",
    "amount-in-cents": String(cents),
    reference: opts.reference,
    "signature:integrity": sha256(`${opts.reference}${cents}COP${secret}`),
    "redirect-url": `${siteConfig.siteUrl.replace(/\/$/, "")}/pago/resultado?ref=${encodeURIComponent(opts.reference)}`,
    "customer-data:email": opts.email,
    "customer-data:full-name": opts.name,
    "customer-data:phone-number": opts.phone,
    "customer-data:phone-number-prefix": "+57",
  });
  return `${CHECKOUT_URL}?${params.toString()}`;
}

export interface WompiTransaction {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  payment_method_type?: string;
}

export interface WompiEvent {
  event?: string;
  data?: { transaction?: WompiTransaction };
  signature?: { properties?: string[]; checksum?: string };
  timestamp?: number;
}

const valueAt = (obj: unknown, path: string): string => {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur === undefined || cur === null ? "" : String(cur);
};

/** Comprueba que el evento lo envió Wompi: SHA256(valores de signature.properties + timestamp + secreto de eventos). */
export function verifyEvent(event: WompiEvent, headerChecksum: string | null): boolean {
  const secret = process.env.WOMPI_EVENTS_SECRET ?? "";
  const props = event.signature?.properties;
  const received = (headerChecksum || event.signature?.checksum || "").toLowerCase();
  if (!secret || !Array.isArray(props) || props.length === 0 || !received || event.timestamp === undefined) return false;
  const expected = sha256(props.map((p) => valueAt(event.data, p)).join("") + String(event.timestamp) + secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
