import { siteConfig } from "@/config/site";
import type { Product, ProductGroup } from "@/types/product";

export const siteBase = () => siteConfig.siteUrl.replace(/\/$/, "");

/** "/products/x.webp" → "https://pitsneakers.com/products/x.webp" (las fotos de vendedores ya vienen con dirección completa). */
export const absoluteUrl = (path: string) => (/^https?:\/\//i.test(path) ? path : `${siteBase()}${path.startsWith("/") ? "" : "/"}${path}`);

export const productUrl = (groupSlug: string) => `${siteBase()}/producto/${groupSlug}`;

const cop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/** Las fichas traen "Comisión incluida en el precio." (dato interno): no sirve como descripción para buscadores. */
const cleanNote = (d: string) => d.replace(/comisi[oó]n incluida en el precio\.?/gi, "").replace(/\s+/g, " ").trim();

/** Descripción pensada para buscadores y Google Shopping: qué es, estado, tallas y desde qué precio. */
export function productDescription(group: ProductGroup): string {
  const sizes = [...new Set(group.variants.flatMap((v) => v.sizes))];
  const from = Math.min(...group.variants.map((v) => v.price));
  const note = cleanNote(group.description);
  const parts = [
    `${group.brand} ${group.name}`.replace(/^(\S+) \1 /, "$1 "),
    group.colorway ? `en color ${group.colorway}` : "",
  ].filter(Boolean);
  const kind = group.category === "sneakers" ? "Sneakers" : group.subcategory === "accesorio" ? "Accesorio" : "Prenda de streetwear";
  return [
    `${kind} ${parts.join(" ")} en Pitsneakers.`,
    note ? (/[.!?]$/.test(note) ? note : `${note}.`) : "",
    "Verificado por nuestro equipo antes de publicarse.",
    sizes.length ? `Tallas disponibles: ${sizes.join(", ")}.` : "",
    Number.isFinite(from) ? `Desde ${cop(from)} COP.` : "",
    `Compra en línea desde ${siteConfig.city}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

const condition = (p: Product) => (p.condition === "usado" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition");

/** Datos estructurados (schema.org) de una ficha: precio, disponibilidad, marca, fotos y cada variante como oferta. */
export function productJsonLd(group: ProductGroup) {
  const url = productUrl(group.groupSlug);
  const prices = group.variants.map((v) => v.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const seller = { "@type": "Organization", name: siteConfig.name, url: siteBase() };
  const offers = group.variants.map((v) => ({
    "@type": "Offer",
    url,
    sku: v.id,
    price: v.price,
    priceCurrency: "COP",
    availability: "https://schema.org/InStock",
    itemCondition: condition(v),
    seller,
    ...(v.sizes.length ? { description: `Talla ${v.sizes.join(", ")}` } : {}),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${group.brand} ${group.name}`.replace(/^(\S+) \1 /, "$1 "),
    description: productDescription(group),
    sku: group.variants[0]?.id,
    brand: { "@type": "Brand", name: group.brand },
    category: group.category === "sneakers" ? "Calzado > Sneakers" : group.subcategory === "accesorio" ? "Accesorios" : "Ropa",
    ...(group.colorway ? { color: group.colorway } : {}),
    image: group.images.slice(0, 6).map(absoluteUrl),
    url,
    offers: offers.length === 1 ? offers[0] : { "@type": "AggregateOffer", priceCurrency: "COP", lowPrice: low, highPrice: high, offerCount: offers.length, offers },
  };
}

export function breadcrumbJsonLd(group: ProductGroup) {
  const section = group.category === "sneakers" ? { name: "Sneakers", path: "/sneakers" } : { name: "Streetwear", path: "/streetwear" };
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteBase() },
      { "@type": "ListItem", position: 2, name: section.name, item: `${siteBase()}${section.path}` },
      { "@type": "ListItem", position: 3, name: `${group.brand} ${group.name}`.replace(/^(\S+) \1 /, "$1 "), item: productUrl(group.groupSlug) },
    ],
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteBase(),
    logo: `${siteBase()}/email/logo.png`,
    sameAs: [siteConfig.instagramUrl],
    address: { "@type": "PostalAddress", addressLocality: "Bogotá", addressCountry: "CO" },
    contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: siteConfig.contactEmail, availableLanguage: "es" },
  };
}

/** Nombre del sitio para Google: es lo que aparece arriba del resultado en lugar de la dirección (solo se pone en la página principal). */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PITSNEAKERS",
    alternateName: [siteConfig.name, "Pits Sneakers"],
    url: `${siteBase()}/`,
  };
}

/** JSON para meter dentro de <script>: se escapa "<" para que ningún texto pueda cerrar la etiqueta. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/* ---------- Feed de Google Merchant Center ---------- */

const xml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
// Caracteres de control que no caben en XML.
const clean = (v: string) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const tag = (name: string, value: string | number | undefined) => (value === undefined || value === "" ? "" : `<${name}>${xml(clean(String(value)))}</${name}>`);
const money = (n: number) => `${Math.round(n)}.00 COP`;

function googleCategory(g: ProductGroup): string {
  if (g.category === "sneakers") return "187"; // Ropa y accesorios > Calzado
  return g.subcategory === "accesorio" ? "167" : "1604"; // Accesorios de ropa / Prendas
}

function itemsFor(group: ProductGroup): string[] {
  const title = `${group.brand} ${group.name}`.replace(/^(\S+) \1 /, "$1 ").slice(0, 150);
  const description = productDescription(group).slice(0, 4900);
  const images = group.images.map(absoluteUrl);
  const out: string[] = [];

  for (const v of group.variants) {
    const sizes = v.sizes.length ? v.sizes : [""];
    for (const size of sizes) {
      const onSale = v.priceBefore && v.priceBefore > v.price;
      // Códigos de fabricante tipo 554724-058: si el SKU lo es, se manda como MPN; si no, se declara que no tiene identificador.
      const mpn = /^[A-Z0-9]{5,}-[A-Z0-9]{3}$/.test(v.id) ? v.id : "";
      out.push(
        "<item>" +
          tag("g:id", size ? `${v.id}-${size}`.replace(/\s+/g, "") : v.id) +
          tag("g:item_group_id", group.groupSlug) +
          tag("g:title", title) +
          tag("g:description", description) +
          tag("g:link", productUrl(group.groupSlug)) +
          tag("g:image_link", images[0]) +
          images.slice(1, 10).map((u) => tag("g:additional_image_link", u)).join("") +
          tag("g:availability", "in_stock") +
          tag("g:price", money(onSale ? v.priceBefore! : v.price)) +
          (onSale ? tag("g:sale_price", money(v.price)) : "") +
          tag("g:brand", group.brand) +
          tag("g:condition", v.condition === "usado" ? "used" : "new") +
          (mpn ? "" : tag("g:identifier_exists", "no")) +
          tag("g:google_product_category", googleCategory(group)) +
          tag("g:product_type", `${group.category === "sneakers" ? "Sneakers" : "Streetwear"} > ${group.brand}`) +
          tag("g:gender", "unisex") +
          tag("g:age_group", "adult") +
          tag("g:color", group.colorway) +
          tag("g:size", size) +
          (size && group.category === "sneakers" && /^\d/.test(size) ? tag("g:size_system", "US") : "") +
          tag("g:mpn", mpn) +
          "</item>",
      );
    }
  }
  return out;
}

/** Feed RSS 2.0 con el espacio g: de Google. Solo entran productos con foto (Google rechaza los que no la tienen). */
export function googleFeedXml(groups: ProductGroup[]): { xml: string; items: number } {
  const items = groups.filter((g) => g.images.length > 0).flatMap(itemsFor);
  return {
    items: items.length,
    xml:
      `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>` +
      tag("title", `${siteConfig.name} — Sneakers y Streetwear Verificados`) +
      tag("link", siteBase()) +
      tag("description", siteConfig.description) +
      items.join("") +
      `</channel></rss>`,
  };
}
