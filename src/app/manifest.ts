import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Manifiesto de aplicación web: permite instalar la página en el celular y define sus colores e íconos. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "es-CO",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
