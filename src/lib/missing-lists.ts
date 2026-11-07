import type { Client } from "@libsql/client";
import { makeZip } from "./zip";

/** Un par del inventario de un revendedor que todavía no se puede publicar solo (falta modelo, foto, precio o talla). */
export interface MissingItem {
  userId: number;
  brand: string;
  name: string;
  colorway: string;
  sku: string;
  size: string;
  condition: string;
  price: number;
  reason: string;
}

export interface SellerInfo {
  id: number;
  username: string;
  displayName: string;
  suspended: boolean;
}

export interface MissingData {
  sellers: SellerInfo[];
  items: MissingItem[];
}

interface RefLine {
  brand: string;
  title: string;
  sku: string;
  sizes: string[];
  price: number;
  used: boolean;
  notes: string[];
}

const loose = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "");
const money = (n: number) => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const sizeNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isNaN(n) ? 999 : n;
};

/** Las razones de "falta la foto" son el caso normal y no se anotan; precio y talla sí. */
function noteFor(reason: string): string {
  const r = loose(reason);
  if (r.includes("faltaelprecio")) return "falta el precio";
  if (r.includes("faltalatalla")) return "falta la talla";
  return "";
}

/** Une los pares que son la misma referencia (mismo código o nombre, precio y estado) en una sola línea con todas sus tallas. */
function groupRefs(items: MissingItem[]): RefLine[] {
  const map = new Map<string, RefLine>();
  for (const i of items) {
    const title = i.colorway && !loose(i.name).includes(loose(i.colorway)) ? `${i.name} ${i.colorway}`.trim() : i.name.trim();
    const used = i.condition === "usado";
    const key = `${loose(i.sku) || loose(title)}|${i.price}|${used}`;
    let ref = map.get(key);
    if (!ref) {
      ref = { brand: i.brand.trim(), title, sku: i.sku.trim(), sizes: [], price: i.price, used, notes: [] };
      map.set(key, ref);
    }
    const size = i.size.trim();
    if (size && !ref.sizes.includes(size)) ref.sizes.push(size);
    const note = noteFor(i.reason);
    if (note && !ref.notes.includes(note)) ref.notes.push(note);
  }
  return [...map.values()]
    .map((r) => ({ ...r, sizes: r.sizes.sort((a, b) => sizeNum(a) - sizeNum(b)) }))
    .sort((a, b) => a.brand.localeCompare(b.brand, "es") || a.title.localeCompare(b.title, "es"));
}

function lines(refs: RefLine[]): string {
  return refs
    .map((r, idx) => {
      const bits = [
        `${r.brand ? r.brand + " · " : ""}${r.title}${r.used ? " (usado)" : ""}`,
        r.sku ? `código ${r.sku}` : "sin código",
        r.sizes.length ? `tallas ${r.sizes.join(", ")}` : "sin talla",
        r.price >= 10_000 ? money(r.price) : "sin precio",
      ];
      const warn = r.notes.length ? ` — ⚠ ${r.notes.join(", ")}` : "";
      return `${String(idx + 1).padStart(2, "0")}. [ ] ${bits.join(" — ")}${warn}`;
    })
    .join("\n");
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const fileSafe = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "revendedor";

const HOW =
  "Se agregan en orden, una por una, cuando llega la foto de cada una: se busca la foto, se pega y listo. Precio = el que puso el revendedor en su inventario. Marca [x] al terminar.";

/** Arma el ZIP: un archivo con todas las listas, una lista por revendedor y el resumen con los usuarios. */
export function makeMissingZip({ sellers, items }: MissingData, today: string): Buffer {
  const bySeller = new Map<number, MissingItem[]>();
  for (const i of items) bySeller.set(i.userId, [...(bySeller.get(i.userId) ?? []), i]);

  const rows = sellers.map((s) => {
    const refs = groupRefs(bySeller.get(s.id) ?? []);
    return { s, refs, pairs: (bySeller.get(s.id) ?? []).length };
  });
  const withMissing = rows.filter((r) => r.refs.length > 0).sort((a, b) => b.refs.length - a.refs.length);
  const totalRefs = withMissing.reduce((n, r) => n + r.refs.length, 0);
  const totalPairs = withMissing.reduce((n, r) => n + r.pairs, 0);
  const label = (s: SellerInfo) => `@${s.username}${s.displayName && s.displayName !== s.username ? ` (${s.displayName})` : ""}`;

  const all = [
    `# Stock que falta subir — todos los revendedores (${today})`,
    "",
    `${withMissing.length} revendedor${withMissing.length === 1 ? "" : "es"} con pares pendientes · ${totalRefs} referencias · ${totalPairs} pares.`,
    "",
    HOW,
    "",
    "## Revendedores",
    "",
    ...(withMissing.length
      ? withMissing.map((r) => `- ${label(r.s)} — ${r.refs.length} referencia${r.refs.length === 1 ? "" : "s"} (${r.pairs} par${r.pairs === 1 ? "" : "es"})`)
      : ["- Nadie tiene pares pendientes."]),
    ...withMissing.flatMap((r) => ["", `## ${label(r.s)} — ${r.refs.length} referencia${r.refs.length === 1 ? "" : "s"}`, "", lines(r.refs)]),
    "",
  ].join("\n");

  const csv =
    "﻿" +
    ["usuario,nombre,referencias_pendientes,pares_pendientes,estado"]
      .concat(
        rows
          .sort((a, b) => b.refs.length - a.refs.length || a.s.username.localeCompare(b.s.username, "es"))
          .map((r) => [r.s.username, r.s.displayName, r.refs.length, r.pairs, r.s.suspended ? "suspendido" : "activo"].map(csvCell).join(","))
      )
      .join("\r\n") +
    "\r\n";

  const used = new Set<string>();
  const perSeller = withMissing.map((r) => {
    let base = fileSafe(r.s.username);
    while (used.has(base)) base += "-2";
    used.add(base);
    return {
      name: `por-revendedor/${base}.md`,
      data: [`# ${label(r.s)} — ${r.refs.length} referencia${r.refs.length === 1 ? "" : "s"} por subir (${r.pairs} par${r.pairs === 1 ? "" : "es"})`, "", HOW, "", lines(r.refs), ""].join("\n"),
    };
  });

  return makeZip([
    { name: "00-TODAS-LAS-LISTAS.md", data: all },
    { name: "00-revendedores.csv", data: csv },
    ...perSeller,
  ]);
}

/** Lee del inventario los pares pendientes (por id) y los revendedores. `pending` viene del plan del catálogo. */
export async function loadMissingData(db: Client, pending: { itemId: number; reason: string }[]): Promise<MissingData> {
  const usersRes = await db.execute("SELECT id, username, display_name, suspended FROM users WHERE role != 'admin' ORDER BY username COLLATE NOCASE");
  const sellers: SellerInfo[] = usersRes.rows.map((r) => ({
    id: Number(r.id),
    username: String(r.username),
    displayName: String(r.display_name ?? ""),
    suspended: Number(r.suspended ?? 0) === 1,
  }));
  const known = new Set(sellers.map((s) => s.id));

  const reasonById = new Map(pending.map((p) => [p.itemId, p.reason]));
  const ids = [...reasonById.keys()];
  const items: MissingItem[] = [];
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400);
    const res = await db.execute({
      sql: `SELECT id, user_id, brand, name, colorway, sku, size, condition, expected_price FROM items WHERE id IN (${chunk.map(() => "?").join(",")}) ORDER BY id`,
      args: chunk,
    });
    for (const r of res.rows) {
      const userId = Number(r.user_id);
      if (!known.has(userId)) continue;
      items.push({
        userId,
        brand: String(r.brand ?? ""),
        name: String(r.name ?? ""),
        colorway: String(r.colorway ?? ""),
        sku: String(r.sku ?? ""),
        size: String(r.size ?? ""),
        condition: String(r.condition ?? "nuevo"),
        price: Number(r.expected_price ?? 0),
        reason: reasonById.get(Number(r.id)) ?? "",
      });
    }
  }
  return { sellers, items };
}
