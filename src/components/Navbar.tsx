"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

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
const baseLinks = [
  { href: "/sneakers", label: "Sneakers", glow: "#ff5a3c" },
  { href: "/streetwear", label: "Streetwear", glow: "#ffd23f" },
  { href: "/lanzamientos", label: "Lanzamientos", glow: "#ff8a3d" },
  { href: "/encargos", label: "Encargos", glow: "#ff6b9d" },
  { href: "/verificacion", label: "Verificación", glow: "#3ddc84" },
  { href: "/contacto", label: "Contacto", glow: "#4cc9f0" },
];

export default function Navbar({ resellerEnabled = false }: { resellerEnabled?: boolean }) {
  const links = resellerEnabled
    ? [...baseLinks, { href: "/revendedores", label: "Vende con nosotros", glow: "#25d366" }]
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="font-display text-xl tracking-wide sm:text-2xl"
        >
          PIT<span className="logo-shine text-accent">SNEAKERS</span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="nav-link nav-glow text-[13px] font-medium uppercase tracking-wide xl:text-sm"
              style={{ "--glow": link.glow, "--i": i } as React.CSSProperties}
            >
              {link.href === "/revendedores" && <span aria-hidden="true" className="nav-dot" />}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {resellerEnabled && (
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-white hover:bg-white/10 sm:px-4 sm:text-xs"
              title={session ? `Sesión de ${session.name}` : "Inicio de sesión para revendedores"}
            >
              <UserIcon />
              {accountLabel}
            </Link>
          )}
          <a
            href={buildGeneralWhatsAppLink(
              "Hola! Quiero más información sobre Pitsneakers"
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-whatsapp px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark sm:inline-block lg:hidden xl:inline-block"
          >
            WhatsApp
          </a>
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="-mr-2 flex h-11 w-11 flex-col items-center justify-center gap-1.5 lg:hidden"
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
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-ink px-6 py-8 lg:hidden">
          <nav className="flex flex-1 flex-col gap-1">
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
