import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  // Con el candado del sitio activo, nada se indexa hasta el lanzamiento.
  if (process.env.SITE_LOCKED === "1") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Paneles privados y rutas internas: no deben aparecer en Google.
        disallow: ["/admin", "/subasta", "/revendedores/panel", "/revendedores/inventario", "/revendedores/ventas", "/revendedores/ranking", "/revendedores/cuenta", "/api/"],
      },
    ],
    sitemap: siteConfig.siteUrl ? `${siteConfig.siteUrl}/sitemap.xml` : undefined,
  };
}
