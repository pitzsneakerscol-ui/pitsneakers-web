import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllGroups } from "@/lib/products";

const PAGES = ["", "/sneakers", "/streetwear", "/lanzamientos", "/encargos", "/verificacion", "/contacto", "/politicas", "/revendedores"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const groups = await getAllGroups();
  const now = new Date();
  return [
    ...PAGES.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: path === "" || path === "/sneakers" || path === "/streetwear" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : path === "/sneakers" || path === "/streetwear" ? 0.9 : 0.6,
    })),
    ...groups.map((g) => ({
      url: `${base}/producto/${g.groupSlug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
