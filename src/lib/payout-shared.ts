/** Pago al revendedor por lo que vendió en la plataforma. Sin dependencias del servidor: lo usan el panel, el admin y los avisos. */

/** Lo que tarda el pago desde que se entrega el pedido. Un solo lugar para cambiarlo. */
export const PAYOUT_WINDOW = "5 a 8 días hábiles";

export type PayoutStatus = "pendiente" | "en_proceso" | "pagado";

export const PAYOUT_STATUSES: PayoutStatus[] = ["pendiente", "en_proceso", "pagado"];

export const isPayoutStatus = (v: string): v is PayoutStatus => (PAYOUT_STATUSES as string[]).includes(v);

/** En la base "" = pendiente (pedido sin movimiento de pago). */
export const parsePayoutStatus = (raw: string): PayoutStatus => (raw === "en_proceso" || raw === "pagado" ? raw : "pendiente");

export const PAYOUT_LABEL: Record<PayoutStatus, string> = {
  pendiente: "Pago pendiente",
  en_proceso: "Pago en proceso",
  pagado: "Pagado",
};

export const PAYOUT_CLS: Record<PayoutStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  en_proceso: "bg-sky-100 text-sky-800",
  pagado: "bg-emerald-100 text-emerald-800",
};

export const PAYOUT_METHODS = ["Bancolombia", "Nequi", "Daviplata", "Otro banco"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const ACCOUNT_TYPES = [
  ["ahorros", "Ahorros"],
  ["corriente", "Corriente"],
] as const;

export interface PayoutInfo {
  method: PayoutMethod;
  /** nombre del banco cuando el método es "Otro banco" */
  bank: string;
  /** ahorros / corriente (vacío en Nequi y Daviplata) */
  accountType: string;
  accountNumber: string;
  holder: string;
  document: string;
  updatedAt: number;
}

export const isPayoutMethod = (v: string): v is PayoutMethod => (PAYOUT_METHODS as readonly string[]).includes(v);

/** Nequi y Daviplata se pagan al celular; el resto necesita banco y tipo de cuenta. */
export const isWallet = (m: PayoutMethod) => m === "Nequi" || m === "Daviplata";

/** Dónde va el pago, en una frase: "Nequi 300 123 4567" / "Bancolombia ahorros ···· 4821". El número se oculta salvo que se pida. */
export function payoutDestination(p: PayoutInfo, reveal = false): string {
  const num = reveal ? p.accountNumber : `···· ${p.accountNumber.slice(-4)}`;
  if (isWallet(p.method)) return `${p.method} ${num}`;
  const bank = p.method === "Otro banco" ? p.bank || "Banco" : p.method;
  return `${bank}${p.accountType ? ` ${p.accountType}` : ""} ${num}`;
}

/** Valida los datos de pago. Devuelve el error en español o los datos limpios. */
export function validatePayout(input: { method: string; bank: string; accountType: string; accountNumber: string; holder: string; document: string }): { error: string } | { data: Omit<PayoutInfo, "updatedAt"> } {
  if (!isPayoutMethod(input.method)) return { error: "Elige cómo quieres recibir el pago." };
  const method = input.method;
  const wallet = isWallet(method);
  const bank = method === "Otro banco" ? input.bank.replace(/\s+/g, " ").trim().slice(0, 40) : "";
  if (method === "Otro banco" && bank.length < 3) return { error: "Escribe el nombre del banco." };
  const accountType = wallet ? "" : input.accountType;
  if (!wallet && !ACCOUNT_TYPES.some(([k]) => k === accountType)) return { error: "Elige el tipo de cuenta (ahorros o corriente)." };
  const accountNumber = input.accountNumber.replace(/\D/g, "");
  if (wallet) {
    if (!/^3\d{9}$/.test(accountNumber)) return { error: `El número de ${method} es el celular de 10 dígitos (empieza por 3).` };
  } else if (accountNumber.length < 6 || accountNumber.length > 20) {
    return { error: "El número de cuenta debe tener entre 6 y 20 dígitos, sin espacios ni guiones." };
  }
  const holder = input.holder.replace(/\s+/g, " ").trim().slice(0, 80);
  if (holder.length < 5 || !holder.includes(" ")) return { error: "Escribe el nombre completo del titular, como figura en la cuenta." };
  const document = input.document.replace(/\D/g, "");
  if (document.length < 5 || document.length > 12) return { error: "Escribe la cédula o NIT del titular, solo números." };
  return { data: { method, bank, accountType, accountNumber, holder, document } };
}
