"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { clearOverride, MAX_PRICE, MIN_PRICE, parsePesos, saveOverride } from "@/lib/catalog-prices";
import { getStaticProducts } from "@/lib/products";
import { loadLiveOverlay } from "@/lib/catalog-live";

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
  const [statics, overlay] = await Promise.all([getStaticProducts(), loadLiveOverlay()]);
  const base = statics.find((p) => p.id === sku) ?? overlay.live.find((p) => p.id === sku);
  if (!base) backTo(fd, sku, "err");

  const price = parsePesos(fd.get("price"));
  const priceBefore = parsePesos(fd.get("priceBefore"));
  if (price < MIN_PRICE || price > MAX_PRICE) backTo(fd, sku, "err");

  // Un "precio antes" menor o igual al actual no es una promo: se ignora.
  await saveOverride(sku, base, { price, priceBefore: priceBefore > price ? priceBefore : 0, hidden: fd.get("hidden") === "on" });
  revalidatePath("/", "layout");
  backTo(fd, sku, "ok");
}

/** Quita el ajuste: el par vuelve al precio del archivo (o del stock del revendedor). */
export async function resetPrice(fd: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(fd.get("sku") ?? "");
  await clearOverride(sku);
  revalidatePath("/", "layout");
  backTo(fd, sku, "ok");
}
