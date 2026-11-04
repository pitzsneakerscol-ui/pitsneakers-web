"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { addVariant, clearOverride, deleteExtra, findBaseProduct, MAX_PRICE, MIN_PRICE, normalizeSizes, parsePesos, saveOverride } from "@/lib/catalog-prices";

/** Vuelve a la misma lista (con su búsqueda y página) y deja el par que se editó a la vista. Solo acepta rutas del propio panel. */
function backTo(fd: FormData, sku: string, status: string): never {
  const url = new URL(String(fd.get("back") ?? ""), "http://panel.local");
  if (url.pathname !== "/admin/precios") url.search = "";
  url.searchParams.delete("ok");
  url.searchParams.delete("err");
  url.searchParams.set(status, sku);
  redirect(`/admin/precios?${url.searchParams.toString()}#p-${encodeURIComponent(sku)}`);
}

/** Cambia el precio, el precio anterior (promo) o la visibilidad de un par del catálogo. */
export async function savePrice(fd: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(fd.get("sku") ?? "");
  const base = await findBaseProduct(sku);
  if (!base) backTo(fd, sku, "err");

  const price = parsePesos(fd.get("price"));
  const priceBefore = parsePesos(fd.get("priceBefore"));
  if (price < MIN_PRICE || price > MAX_PRICE) backTo(fd, sku, "err");

  // Un "precio antes" menor o igual al actual no es una promo: se ignora.
  await saveOverride(sku, base, { price, priceBefore: priceBefore > price ? priceBefore : 0, hidden: fd.get("hidden") === "on" });
  revalidatePath("/", "layout");
  backTo(fd, sku, "ok");
}

export type VariantResult = { ok: true } | { ok: false; error: string };

/**
 * Lo que usa el editor de la página del producto: precio, precio anterior y la lista completa de tallas de un par.
 * Se comprueba aquí que quien llama es el dueño (la página es pública y estática, así que el botón solo se muestra al admin, pero el permiso real es este).
 */
export async function saveVariant(input: { sku: string; price: number; priceBefore: number; sizes: string[]; hidden: boolean }): Promise<VariantResult> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return { ok: false, error: "Tu sesión de administrador venció. Ingresa de nuevo." };

  const base = await findBaseProduct(input.sku);
  if (!base) return { ok: false, error: "Ese par ya no está en el catálogo." };

  const price = Math.round(Number(input.price));
  const priceBefore = Math.round(Number(input.priceBefore)) || 0;
  if (!Number.isSafeInteger(price) || price < MIN_PRICE || price > MAX_PRICE) return { ok: false, error: "Escribe un precio entre $1.000 y $99.999.999." };

  const sizes = normalizeSizes(Array.isArray(input.sizes) ? input.sizes.slice(0, 40) : []);
  // Sin tallas el par no se puede vender (el pago lo tomaría como talla única): si quitas todas, se oculta.
  const hidden = Boolean(input.hidden) || (sizes.length === 0 && base.sizes.length > 0);

  await saveOverride(input.sku, base, { price, priceBefore: priceBefore > price ? priceBefore : 0, hidden, sizes });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Agrega a la silueta otra opción con sus tallas y su precio (ej. la 11 a otro precio). */
export async function addSiluetaVariant(input: { from: string; sizes: string[]; price: number; priceBefore: number; condition: string }): Promise<VariantResult> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return { ok: false, error: "Tu sesión de administrador venció. Ingresa de nuevo." };

  const sizes = normalizeSizes(Array.isArray(input.sizes) ? input.sizes.slice(0, 40) : []);
  if (sizes.length === 0) return { ok: false, error: "Escribe al menos una talla (por ejemplo 11 o 11, 11.5)." };
  const price = Math.round(Number(input.price));
  if (!Number.isSafeInteger(price) || price < MIN_PRICE || price > MAX_PRICE) return { ok: false, error: "Escribe un precio entre $1.000 y $99.999.999." };
  const priceBefore = Math.round(Number(input.priceBefore)) || 0;
  const condition = input.condition === "usado" ? "usado" : "nuevo";

  const added = await addVariant(String(input.from), { sizes, price, priceBefore, condition });
  if (!added) return { ok: false, error: "No se pudo agregar: ese par ya no está en el catálogo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Elimina una variante que se agregó a mano. Los pares del archivo no se borran desde aquí (se ocultan). */
export async function removeSiluetaVariant(sku: string): Promise<VariantResult> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return { ok: false, error: "Tu sesión de administrador venció. Ingresa de nuevo." };
  const done = await deleteExtra(String(sku));
  if (!done) return { ok: false, error: "Solo se pueden eliminar las opciones que agregaste desde aquí. Para sacar un par del catálogo, ocúltalo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Quita todos los ajustes de un par desde el editor de la página del producto. */
export async function resetVariant(sku: string): Promise<VariantResult> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return { ok: false, error: "Tu sesión de administrador venció. Ingresa de nuevo." };
  await clearOverride(String(sku));
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Quita el ajuste: el par vuelve al precio del archivo (o del stock del revendedor). */
export async function resetPrice(fd: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(fd.get("sku") ?? "");
  await clearOverride(sku);
  revalidatePath("/", "layout");
  backTo(fd, sku, "ok");
}
