"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";
import ThemeToggle from "@/components/ThemeToggle";

interface Session {
  name: string;
  admin: boolean;
}

function UserIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="7" r="3.2" />
      <path d="M3.5 16.5c.8-3 3.3-4.6 6.5-4.6s5.7 1.6 6.5 4.6" />
    </svg>
  );
}

// Cada palabra tiene su propio color de brillo (ola de brillo y al pasar el mouse).
interface NavLink {
  href: string;
  label: string;
  glow: string;
  /** Versión corta para pantallas de 1280 a 1535 px: así el menú no se aprieta. */
  short?: string;
}

const baseLinks: NavLink[] = [
  { href: "/sneakers", label: "Sneakers", glow: "#ff5a3c" },
  { href: "/streetwear", label: "Streetwear", glow: "#ffd23f" },
  { href: "/lanzamientos", label: "Lanzamientos", glow: "#ff8a3d" },
  { href: "/encargos", label: "Encargos", glow: "#ff6b9d" },
  { href: "/verificacion", label: "Verificación", glow: "#3ddc84" },
  { href: "/contacto", label: "Contacto", glow: "#4cc9f0" },
];

export default function Navbar({ resellerEnabled = false }: { resellerEnabled?: boolean }) {
  const links: NavLink[] = resellerEnabled
    ? [...baseLinks, { href: "/revendedores", label: "Vende con nosotros", short: "Vende", glow: "#25d366" }]
    : baseLinks;
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const pathname = usePathname();

  // Si el vendedor ya tiene sesión abierta, el botón dice "Mi panel" en vez de "Ingresar".
  useEffect(() => {
    if (!resellerEnabled) return;
    let alive = true;
    fetch("/api/sesion", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.in) setSession({ name: String(d.name ?? ""), admin: Boolean(d.admin) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [resellerEnabled, pathname]);

  const accountHref = session ? (session.admin ? "/admin" : "/revendedores/panel") : "/revendedores/ingresar";
  const accountLabel = session ? "Mi panel" : "Ingresar";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-ink text-white">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="shrink-0 whitespace-nowrap font-display text-xl tracking-wide sm:text-2xl"
        >
          PIT<span className="logo-shine text-accent">SNEAKERS</span>
        </Link>

        <nav className="hidden min-w-0 items-center gap-6 xl:flex 2xl:gap-9">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="nav-link nav-glow whitespace-nowrap text-[13px] font-medium uppercase tracking-[0.05em]"
              style={{ "--glow": link.glow, "--i": i } as React.CSSProperties}
            >
              {link.href === "/revendedores" && <span aria-hidden="true" className="nav-dot" />}
              {link.short ? (
                <>
                  <span className="2xl:hidden">{link.short}</span>
                  <span className="hidden 2xl:inline">{link.label}</span>
                </>
              ) : (
                link.label
              )}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {resellerEnabled && (
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-white hover:bg-white/10 sm:px-4 sm:text-xs"
              title={session ? `Sesión de ${session.name}` : "Inicio de sesión para revendedores"}
            >
              <UserIcon />
              {accountLabel}
            </Link>
          )}
          <ThemeToggle />
          <a
            href={buildGeneralWhatsAppLink(
              "Hola! Quiero más información sobre Pitsneakers"
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden whitespace-nowrap rounded-full bg-whatsapp px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark sm:inline-block"
          >
            WhatsApp
          </a>
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="-mr-2 flex h-11 w-11 flex-col items-center justify-center gap-1.5 xl:hidden"
          >
            <span
              className={`h-px w-6 bg-white transition ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
            />
            <span
              className={`h-px w-6 bg-white transition ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink px-6 pb-28 xl:hidden" role="dialog" aria-modal="true" aria-label="Menú principal">
          {/* Barra propia del menú: logo (lleva al inicio) y botón para cerrar, siempre a la vista. */}
          <div className="-mx-6 mb-2 flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6">
            <Link href="/" onClick={() => setOpen(false)} className="font-display text-xl tracking-wide">
              PIT<span className="text-accent">SNEAKERS</span>
            </Link>
            <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              aria-current={pathname === "/" ? "page" : undefined}
              className="menu-item flex items-center gap-3 border-b border-white/10 py-4 font-display text-2xl tracking-wide"
              style={{ "--glow": "#ffffff", "--i": 0 } as React.CSSProperties}
            >
              <span aria-hidden="true" className="menu-bar" />
              <span className="nav-glow">Inicio</span>
            </Link>
            {links.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === link.href ? "page" : undefined}
                className="menu-item flex items-center gap-3 border-b border-white/10 py-4 font-display text-2xl tracking-wide"
                style={{ "--glow": link.glow, "--i": i } as React.CSSProperties}
              >
                <span aria-hidden="true" className="menu-bar" />
                <span className="nav-glow">{link.label}</span>
                {link.href === "/revendedores" && <span aria-hidden="true" className="nav-dot" />}
              </Link>
            ))}
          </nav>
          {resellerEnabled && (
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white"
            >
              <UserIcon />
              {session ? `Mi panel · ${session.name}` : "Iniciar sesión (revendedores)"}
            </Link>
          )}
          <a
            href={buildGeneralWhatsAppLink(
              "Hola! Quiero más información sobre Pitsneakers"
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center rounded-full bg-whatsapp px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white"
          >
            Escríbenos por WhatsApp
          </a>
          <p className="mt-4 text-center text-xs text-white/50">
            {siteConfig.instagramHandle} · {siteConfig.city}
          </p>
        </div>
      )}
    </header>
  );
}
