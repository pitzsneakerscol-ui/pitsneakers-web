import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Paneles privados y rutas internas: no deben aparecer en Google.
        disallow: ["/admin", "/revendedores/panel", "/revendedores/inventario", "/revendedores/ventas", "/revendedores/ranking", "/revendedores/cuenta", "/api/"],
      },
    ],
    sitemap: siteConfig.siteUrl ? `${siteConfig.siteUrl}/sitemap.xml` : undefined,
  };
}
