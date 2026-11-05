import "server-only";
import assignmentsJson from "@/data/assignments.json";
import { getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { formatPrice } from "@/lib/format";
import { getAllProducts } from "@/lib/products";
import { parseKind, type ItemKind } from "@/lib/reseller-shared";
import type { BuyerOffer } from "@/lib/buyer-offers";
import type { SellerAssignment } from "@/lib/sheet-source";
import type { Product } from "@/types/product";

const assignments = assignmentsJson as SellerAssignment[];

const loose = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9@]+/g, "");

/**
 * El revendedor dueño de un par del catálogo, o null si es un par de la casa o no se puede saber:
 *  - par "en vivo" (LIVE-<id del par>): el dueño del par en su inventario.
 *  - par del catálogo con vendedor: el de la columna VENDEDOR (assignments.json), que comparte slug con el producto.
 */
export async function sellerIdForProduct(product: Product): Promise<number | null> {
  const db = await getDb();
  const live = /^LIVE-(\d+)$/.exec(product.id);
  if (live) {
    const r = await db.execute({
      sql: "SELECT i.user_id AS user_id FROM items i JOIN users u ON u.id = i.user_id WHERE i.id = ? AND u.role != 'admin' AND u.suspended = 0",
      args: [Number(live[1])],
    });
    return r.rows[0] ? Number(r.rows[0].user_id) : null;
  }
  const a = assignments.find((x) => x.slug === product.slug);
  if (!a) return null;
  const want = loose(a.seller);
  if (!want) return null;
  const users = await db.execute("SELECT id, username, email, display_name FROM users WHERE role != 'admin' AND suspended = 0 ORDER BY id");
  for (const u of users.rows) {
    if ([u.username, u.email, u.display_name].some((k) => k && loose(String(k)) === want)) return Number(u.id);
  }
  return null;
}

/**
 * Dueño de un par a partir del id del producto de un pedido, con el tipo de artículo (decide la comisión).
 * Un par "en vivo" se resuelve aunque ya no esté publicado (se acaba de vender); uno del catálogo debe seguir en la lista.
 */
export async function sellerForProductId(productId: string): Promise<{ userId: number; kind: ItemKind } | null> {
  const db = await getDb();
  const live = /^LIVE-(\d+)$/.exec(productId);
  if (live) {
    const r = await db.execute({
      sql: "SELECT i.user_id AS user_id, i.kind AS kind FROM items i JOIN users u ON u.id = i.user_id WHERE i.id = ? AND u.role != 'admin' AND u.suspended = 0",
      args: [Number(live[1])],
    });
    return r.rows[0] ? { userId: Number(r.rows[0].user_id), kind: parseKind(r.rows[0].kind) } : null;
  }
  const product = (await getAllProducts()).find((p) => p.id === productId);
  if (!product) return null;
  const userId = await sellerIdForProduct(product);
  if (!userId) return null;
  return { userId, kind: parseKind(assignments.find((x) => x.slug === product.slug)?.kind) };
}

/**
 * Un cliente hizo una oferta por un par que está a nombre de un revendedor: se lo avisamos (campana + celular + navegador).
 * Solo ve el valor ofrecido y su precio; nunca los datos del comprador. La oferta la responde el equipo desde el admin.
 * Nunca lanza error: no debe romper la oferta del cliente.
 */
export async function notifySellerOfBuyerOffer(offer: BuyerOffer, product: Product): Promise<void> {
  try {
    const userId = await sellerIdForProduct(product);
    if (!userId) return;
    const par = product.brand && !product.name.toLowerCase().startsWith(product.brand.toLowerCase()) ? `${product.brand} ${product.name}` : product.name;
    const size = offer.size && offer.size !== "Única" ? `Talla ${offer.size}. ` : "";
    await createNotification(userId, {
      kind: "info",
      title: `Un cliente ofreció ${formatPrice(offer.amount)} por tu ${par}`,
      body: `${size}Tu precio publicado: ${formatPrice(offer.listPrice)}. El equipo responde la oferta y te avisa si se concreta.`,
      href: "/revendedores/inventario",
    });
  } catch (e) {
    console.error("[ofertas] no se pudo avisar al revendedor:", e);
  }
}
