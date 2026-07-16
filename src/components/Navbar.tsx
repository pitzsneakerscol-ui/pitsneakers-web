"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

const links = [
  { href: "/sneakers", label: "Sneakers" },
  { href: "/streetwear", label: "Streetwear" },
  { href: "/lanzamientos", label: "Lanzamientos" },
  { href: "/encargos", label: "Encargos" },
  { href: "/verificacion", label: "Verificación" },
  { href: "/contacto", label: "Contacto" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
          PIT<span className="text-accent">SNEAKERS</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm uppercase tracking-wide transition hover:text-accent ${
                pathname === link.href ? "text-accent" : "text-white/85"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={buildGeneralWhatsAppLink(
              "Hola! Quiero más información sobre Pitsneakers"
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-whatsapp px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-whatsapp-dark sm:inline-block"
          >
            WhatsApp
          </a>
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 lg:hidden"
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
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`border-b border-white/10 py-4 font-display text-2xl tracking-wide ${
                  pathname === link.href ? "text-accent" : "text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <a
            href={buildGeneralWhatsAppLink(
              "Hola! Quiero más información sobre Pitsneakers"
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-whatsapp px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white"
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
