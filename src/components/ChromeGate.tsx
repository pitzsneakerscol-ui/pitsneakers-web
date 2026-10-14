"use client";

import { usePathname } from "next/navigation";

/**
 * Panel de revendedores y de administración: ahí no se muestran la barra de anuncios, el menú ni el pie del sitio público.
 * Tampoco en la página "Próximamente" ni en el ingreso/recuperación de vendedores (los únicos accesos abiertos con el candado del sitio).
 */
const PANEL = /^\/(revendedores\/(panel|inventario|ventas|ranking|cuenta|avisos|consultas|ofertas)|admin|proximamente|subasta|trivia)(\/|$)/;
const AUTH = /^\/(revendedores\/(ingresar|recuperar|restablecer)|politicas)(\/|$)/;

export default function ChromeGate({ children, locked = false }: { children: React.ReactNode; locked?: boolean }) {
  const pathname = usePathname();
  if (PANEL.test(pathname) || (locked && AUTH.test(pathname))) return null;
  return <>{children}</>;
}
