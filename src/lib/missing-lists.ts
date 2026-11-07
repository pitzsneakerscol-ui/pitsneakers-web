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
  /** SKUs del catálogo que ya cubren este par (se llena al cruzar con el catálogo publicado). */
  siteIds?: string[];
}

export interface SellerInfo {
  id: number;
  username: string;
  displayName: string;
  suspended: boolean;
}

/** Un par ya publicado en el catálogo (para no listar como faltante lo que ya está en la página). */
export interface CatalogModel {
  id: string;
  name: string;
  brand: string;
  colorway?: string;
  sizes: string[];
  price: number;
  condition: string;
  /** Código de estilo del fabricante, si la descripción lo trae. */
  code: string;
}

export interface MissingData {
  sellers: SellerInfo[];
  items: MissingItem[];
  /** Catálogo publicado: si viene, los pares cuyo modelo ya está en la página no se piden como faltantes. */
  catalog?: CatalogModel[];
}

interface RefLine {
  brand: string;
  title: string;
  sku: string;
  sizes: string[];
  price: number;
  used: boolean;
  notes: string[];
  /** SKUs del catálogo con los que coincide (solo para los grupos "ya está" y "modelo ya está"). */
  ids: string[];
}

type Bucket = "falta" | "modelo" | "ya";

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
      ref = { brand: i.brand.trim(), title, sku: i.sku.trim(), sizes: [], price: i.price, used, notes: [], ids: [] };
      map.set(key, ref);
    }
    for (const id of i.siteIds ?? []) if (!ref.ids.includes(id)) ref.ids.push(id);
    const size = i.size.trim();
    if (size && !ref.sizes.includes(size)) ref.sizes.push(size);
    const note = noteFor(i.reason);
    if (note && !ref.notes.includes(note)) ref.notes.push(note);
  }
  return [...map.values()]
    .map((r) => ({ ...r, sizes: r.sizes.sort((a, b) => sizeNum(a) - sizeNum(b)) }))
    .sort((a, b) => a.brand.localeCompare(b.brand, "es") || a.title.localeCompare(b.title, "es"));
}

const wordSet = (v: string, ...skip: string[]) => {
  const out = new Set(
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
  out.delete("x");
  // Dunk y Air Force 1 se venden casi siempre en "Low": el catálogo y los revendedores lo escriben o no indistintamente.
  if (out.has("dunk") || (out.has("air") && out.has("force"))) out.delete("low");
  for (const s of skip) for (const w of s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").split(/[^a-z0-9]+/)) out.delete(w);
  return out;
};
const sameSet = (a: Set<string>, b: Set<string>) => a.size > 0 && a.size === b.size && [...a].every((w) => b.has(w));
const fullTitle = (name: string, colorway?: string) => (colorway && !loose(name).includes(loose(colorway)) ? `${name} ${colorway}` : name);
const sameBrand = (a: string, b: string) => {
  const x = loose(a);
  const y = loose(b);
  return !x || !y || x === y || x.includes(y) || y.includes(x);
};
const normSize = (s: string) => s.trim().toLowerCase().replace(",", ".");

/**
 * Clasifica un par contra el catálogo ya publicado:
 *  - "ya": hay un par igual (mismo modelo, talla, precio y estado) → no hay que subir nada.
 *  - "modelo": el modelo ya está en la página con foto, pero este par (talla/precio/estado) no → solo se agrega la fila, sin buscar foto.
 *  - "falta": el modelo no está → falta todo (foto incluida).
 * Un modelo coincide por código de estilo (si ambos lo traen) o por nombre idéntico (sin marca ni "x"); con códigos distintos nunca coincide.
 */
function classify(i: MissingItem, catalog: CatalogModel[]): { bucket: Bucket; ids: string[] } {
  const ik = loose(i.sku);
  const itemWords = wordSet(fullTitle(i.name, i.colorway), i.brand);
  const hit = catalog.filter((m) => {
    if (!sameBrand(i.brand, m.brand)) return false;
    const mk = loose(m.code);
    if (ik.length >= 5 && mk) return ik === mk;
    return sameSet(itemWords, wordSet(fullTitle(m.name, m.colorway), m.brand, i.brand));
  });
  if (!hit.length) return { bucket: "falta", ids: [] };
  // Todas las filas del catálogo que son el mismo modelo (comparten nombre) para ver si el par exacto ya está.
  const family = catalog.filter((c) =>
    hit.some((m) => sameBrand(c.brand, m.brand) && sameSet(wordSet(fullTitle(c.name, c.colorway), c.brand, m.brand), wordSet(fullTitle(m.name, m.colorway), m.brand, c.brand)))
  );
  const pool = family.length ? family : hit;
  const same = pool.filter((c) => c.price === i.price && (c.condition || "nuevo") === i.condition && c.sizes.some((s) => normSize(s) === normSize(i.size)));
  return same.length ? { bucket: "ya", ids: same.map((c) => c.id) } : { bucket: "modelo", ids: pool.map((c) => c.id) };
}

function lines(refs: RefLine[], bucket: Bucket = "falta"): string {
  return refs
    .map((r, idx) => {
      const n = String(idx + 1).padStart(2, "0");
      const title = `${r.brand ? r.brand + " · " : ""}${r.title}${r.used ? " (usado)" : ""}`;
      const sizes = r.sizes.length ? `tallas ${r.sizes.join(", ")}` : "sin talla";
      const price = r.price >= 10_000 ? money(r.price) : "sin precio";
      const ids = r.ids.slice(0, 4).join(", ");
      if (bucket === "ya") return `${n}. ${title} — ${sizes} — ${price} — ya está en la página (${ids})`;
      const bits = [title, r.sku ? `código ${r.sku}` : "sin código", sizes, price];
      const warn = r.notes.length ? ` — ⚠ ${r.notes.join(", ")}` : "";
      const note = bucket === "modelo" ? ` — el modelo ya está con foto (${ids}): solo falta agregar este par` : "";
      return `${n}. [ ] ${bits.join(" — ")}${warn}${note}`;
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
export function makeMissingZip({ sellers, items, catalog }: MissingData, today: string): Buffer {
  const bySeller = new Map<number, MissingItem[]>();
  for (const i of items) bySeller.set(i.userId, [...(bySeller.get(i.userId) ?? []), i]);

  const rows = sellers.map((s) => {
    const parts: Record<Bucket, MissingItem[]> = { falta: [], modelo: [], ya: [] };
    for (const i of bySeller.get(s.id) ?? []) {
      const c = catalog ? classify(i, catalog) : { bucket: "falta" as Bucket, ids: [] as string[] };
      parts[c.bucket].push({ ...i, siteIds: c.ids });
    }
    return { s, refs: groupRefs(parts.falta), modelo: groupRefs(parts.modelo), ya: groupRefs(parts.ya), pairs: parts.falta.length };
  });
  const todo = (r: (typeof rows)[number]) => r.refs.length + r.modelo.length;
  const withMissing = rows.filter((r) => todo(r) > 0).sort((a, b) => todo(b) - todo(a));
  const withYa = rows.filter((r) => todo(r) === 0 && r.ya.length > 0);
  const totalRefs = withMissing.reduce((n, r) => n + r.refs.length, 0);
  const totalPairs = withMissing.reduce((n, r) => n + r.pairs, 0);
  const totalModelo = withMissing.reduce((n, r) => n + r.modelo.length, 0);
  const totalYa = rows.reduce((n, r) => n + r.ya.length, 0);
  const label = (s: SellerInfo) => `@${s.username}${s.displayName && s.displayName !== s.username ? ` (${s.displayName})` : ""}`;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const sections = (r: (typeof rows)[number]) => [
    ...(r.refs.length ? ["### Falta subir (modelo y foto)", "", lines(r.refs, "falta"), ""] : []),
    ...(r.modelo.length ? ["### El modelo ya está en la página: solo falta agregar el par (no hay que buscar foto)", "", lines(r.modelo, "modelo"), ""] : []),
    ...(r.ya.length ? ["### Ya están en la página (no hay que hacer nada)", "", lines(r.ya, "ya"), ""] : []),
  ];
  const summary = (r: (typeof rows)[number]) =>
    `${plural(r.refs.length, "referencia", "referencias")} por subir (${plural(r.pairs, "par", "pares")})` +
    (r.modelo.length ? ` + ${plural(r.modelo.length, "par", "pares")} del modelo que ya está` : "") +
    (r.ya.length ? ` · ${r.ya.length} ya en la página` : "");

  const all = [
    `# Stock que falta subir — todos los revendedores (${today})`,
    "",
    `${plural(withMissing.length, "revendedor", "revendedores")} con pendientes · ${plural(totalRefs, "referencia", "referencias")} por subir (${plural(totalPairs, "par", "pares")})` +
      (totalModelo ? ` · ${plural(totalModelo, "referencia", "referencias")} cuyo modelo ya está en la página (solo agregar el par)` : "") +
      (totalYa ? ` · ${totalYa} ya estaban en la página y no se piden` : "") +
      ".",
    "",
    HOW,
    "",
    "## Revendedores",
    "",
    ...(withMissing.length ? withMissing.map((r) => `- ${label(r.s)} — ${summary(r)}`) : ["- Nadie tiene pares pendientes."]),
    ...withMissing.flatMap((r) => ["", `## ${label(r.s)} — ${summary(r)}`, "", ...sections(r)]),
    ...(withYa.length
      ? ["", "## Revendedores con todo ya en la página", "", ...withYa.map((r) => `- ${label(r.s)} — ${r.ya.length} ya en la página`)]
      : []),
    "",
  ].join("\n");

  const csv =
    "﻿" +
    ["usuario,nombre,referencias_por_subir,pares_por_subir,solo_agregar_par,ya_en_la_pagina,estado"]
      .concat(
        [...rows]
          .sort((a, b) => todo(b) - todo(a) || a.s.username.localeCompare(b.s.username, "es"))
          .map((r) => [r.s.username, r.s.displayName, r.refs.length, r.pairs, r.modelo.length, r.ya.length, r.s.suspended ? "suspendido" : "activo"].map(csvCell).join(","))
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
      data: [`# ${label(r.s)} — ${summary(r)}`, "", HOW, "", ...sections(r)].join("\n"),
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
