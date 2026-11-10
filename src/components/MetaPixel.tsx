"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, trackMeta } from "@/lib/meta-client";

/** Rutas del equipo: no se miden para no contaminar las audiencias con las visitas internas. */
const INTERNAL = /^\/(admin|revendedores\/panel)(\/|$)/;

/**
 * Píxel de Meta. Solo se carga si existe NEXT_PUBLIC_META_PIXEL_ID (Vercel → Settings → Environment Variables).
 * - PageView en cada cambio de página (la web navega sin recargar, por eso no basta el del script).
 * - Contact cuando alguien toca un enlace a WhatsApp (wa.me).
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const internal = INTERNAL.test(pathname);

  useEffect(() => {
    if (!META_PIXEL_ID || internal) return;
    trackMeta("PageView");
  }, [pathname, internal]);

  useEffect(() => {
    if (!META_PIXEL_ID || internal) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href") ?? "";
      if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) trackMeta("Contact");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [internal]);

  if (!META_PIXEL_ID || internal) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID.replace(/\D/g, "")}');var q=window.__pitq||[];window.__pitq=null;q.forEach(function(a){fbq.apply(null,a)});`}
    </Script>
  );
}
