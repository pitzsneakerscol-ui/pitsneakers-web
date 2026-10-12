"use client";

import { usePathname } from "next/navigation";

/** Panel de revendedores y de administración: ahí no se muestran la barra de anuncios, el menú ni el pie del sitio público. */
const PANEL = /^\/(revendedores\/(panel|inventario|ventas|ranking|cuenta|avisos|consultas)|admin)(\/|$)/;

export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (PANEL.test(pathname)) return null;
  return <>{children}</>;
}
