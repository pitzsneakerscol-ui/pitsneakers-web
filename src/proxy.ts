import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Candado del sitio: con SITE_LOCKED=1 el público solo ve /proximamente (donde deja su correo).
 * Siguen abiertos el ingreso de vendedores, sus paneles, /admin, las APIs y los archivos estáticos.
 * Para ver la página completa tú mismo: entra una vez a  https://tu-sitio/?acceso=CLAVE  (CLAVE = SITE_PREVIEW_KEY).
 */
const OPEN =
  /^\/(proximamente|subasta|admin|api|_next)(\/|$)|^\/revendedores\/(ingresar|recuperar|restablecer|panel|inventario|ventas|ranking|cuenta|avisos|consultas|ofertas|exportar|plantilla)(\/|$)|^\/(robots\.txt|sitemap\.xml|favicon\.ico)$|\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|css|js|map|txt|xml|mp4|webm)$/i;

const COOKIE = "pits_acceso";

export function proxy(request: NextRequest) {
  if (process.env.SITE_LOCKED !== "1") return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;
  const key = (process.env.SITE_PREVIEW_KEY ?? "").trim();

  // Enlace de acceso del dueño: guarda una cookie y limpia la dirección.
  if (key && searchParams.get("acceso") === key) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("acceso");
    const res = NextResponse.redirect(clean);
    res.cookies.set(COOKIE, key, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }
  if (key && request.cookies.get(COOKIE)?.value === key) return NextResponse.next();
  if (OPEN.test(pathname)) return NextResponse.next();

  return NextResponse.redirect(new URL("/proximamente", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
