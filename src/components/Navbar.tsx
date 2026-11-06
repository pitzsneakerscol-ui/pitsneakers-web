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
  /** comprador con cuenta (no revendedor) */
  buyer?: boolean;
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

interface Purchase {
  name: string;
  product: string;
  brand: string;
  image: string;
  size: string;
  at: number;
  ago: string;
}

/** "hace 3 h", "ayer", "hace 4 días". */
function agoLabel(at: number): string {
  const min = Math.max(0, Math.floor((Date.now() - at) / 60000));
  if (min < 60) return "hace menos de 1 hora";
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

// Menú del celular: lo que más se mira va en mosaicos y lo demás en una lista corta con una frase de ayuda.
const TILE_HREFS = ["/sale", "/sneakers", "/streetwear", "/lanzamientos"];
const SERVICE_HREFS = ["/encargos", "/verificacion", "/revendedores", "/contacto"];
const MENU_HINTS: Record<string, string> = {
  "/encargos": "¿No encuentras tu par? Pídelo",
  "/verificacion": "Cómo revisamos cada par",
  "/revendedores": "Consigna tus pares",
  "/contacto": "Escríbenos o visítanos",
};

const baseLinks: NavLink[] = [
  { href: "/sneakers", label: "Sneakers", glow: "#ff5a3c" },
  { href: "/streetwear", label: "Streetwear", glow: "#ffd23f" },
  { href: "/lanzamientos", label: "Lanzamientos", glow: "#ff8a3d" },
  { href: "/encargos", label: "Encargos", glow: "#ff6b9d" },
  { href: "/verificacion", label: "Verificación", glow: "#3ddc84" },
  { href: "/contacto", label: "Contacto", glow: "#4cc9f0" },
];

export default function Navbar({ resellerEnabled = false, saleEnabled = false, saleLabel = "Sale" }: { resellerEnabled?: boolean; saleEnabled?: boolean; saleLabel?: string }) {
  const withSale: NavLink[] = saleEnabled
    ? [{ href: "/sale", label: saleLabel, glow: "#ff3b30" }, ...baseLinks]
    : baseLinks;
  const links: NavLink[] = resellerEnabled
    ? [...withSale, { href: "/revendedores", label: "Vende con nosotros", short: "Vende", glow: "#25d366" }]
    : withSale;
  const tiles = TILE_HREFS.map((h) => links.find((l) => l.href === h)).filter((l): l is NavLink => Boolean(l));
  const services = SERVICE_HREFS.map((h) => links.find((l) => l.href === h)).filter((l): l is NavLink => Boolean(l));
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<Purchase[] | null>(null);
  const [ri, setRi] = useState(0);
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
        else if (alive && d?.buyer) setSession({ name: String(d.buyer.name ?? ""), admin: false, buyer: true });
        else if (alive) setSession(null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [resellerEnabled, pathname]);

  const accountHref = session ? (session.admin ? "/admin" : session.buyer ? "/cuenta" : "/revendedores/panel") : "/cuenta/ingresar";
  const accountLabel = session ? (session.buyer ? "Mi cuenta" : "Mi panel") : "Ingresar";

  // Últimas compras reales: se piden la primera vez que se abre el menú y se van mostrando de a una.
  useEffect(() => {
    if (!open || recent !== null) return;
    let alive = true;
    fetch("/api/compras-recientes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: Omit<Purchase, "ago">[] } | null) => {
        if (!alive) return;
        setRecent((Array.isArray(d?.items) ? d.items : []).map((p) => ({ ...p, ago: agoLabel(p.at) })));
      })
      .catch(() => {
        if (alive) setRecent([]);
      });
    return () => {
      alive = false;
    };
  }, [open, recent]);
  useEffect(() => {
    if (!open || !recent || recent.length < 2) return;
    const t = setInterval(() => setRi((i) => (i + 1) % recent.length), 4500);
    return () => clearInterval(t);
  }, [open, recent]);
  const shown = recent && recent.length > 0 ? recent[ri % recent.length] : null;

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
              title={session ? `Sesión de ${session.name}` : "Ingresar o crear tu cuenta"}
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
          {/* Menú en tres bloques: tu cuenta, lo que más se mira (mosaicos) y lo secundario (lista corta). */}
          <nav className="flex flex-1 flex-col gap-5 pt-4" aria-label="Menú principal">
            {resellerEnabled && (
              <Link
                href={accountHref}
                onClick={() => setOpen(false)}
                className="menu-item flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition active:scale-[0.99]"
                style={{ "--i": 0 } as React.CSSProperties}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <UserIcon />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-base font-semibold">
                    {session ? `Hola, ${session.name.split(" ")[0] || "tú"}` : "Ingresar"}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/60">
                    {session ? (session.buyer ? "Mi cuenta" : "Mi panel") : "Crea tu cuenta, guarda favoritos y haz ofertas"}
                  </span>
                </span>
                <Chevron />
              </Link>
            )}

            <ul className="grid grid-cols-2 gap-3">
              {tiles.map((link, i) => (
                <li key={link.href} className="[&:nth-child(odd):last-child]:col-span-2">
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className="menu-item flex h-28 flex-col justify-between rounded-2xl border border-white/10 p-4 transition active:scale-[0.98] aria-[current=page]:border-white/40"
                    style={
                      {
                        "--glow": link.glow,
                        "--i": i + 1,
                        backgroundImage: "linear-gradient(150deg, color-mix(in srgb, var(--glow) 26%, transparent) 0%, transparent 70%)",
                      } as React.CSSProperties
                    }
                  >
                    <span aria-hidden="true" className="menu-bar" />
                    <span className="font-display leading-none tracking-wide" style={{ fontSize: "clamp(1rem, 5vw, 1.25rem)" }}>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {services.map((link, i) => (
                <li key={link.href} className="border-b border-white/10 last:border-b-0">
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className="menu-item flex items-center gap-3 px-4 py-3.5 transition active:bg-white/5"
                    style={{ "--glow": link.glow, "--i": tiles.length + i + 1 } as React.CSSProperties}
                  >
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="flex items-center gap-2 text-base font-semibold">
                        {link.short ?? link.label}
                        {link.href === "/revendedores" && <span aria-hidden="true" className="nav-dot" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-white/50">{MENU_HINTS[link.href]}</span>
                    </span>
                    <Chevron />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* Prueba social: las últimas compras reales, una a la vez. Si todavía no hay ninguna que mostrar, queda el botón de Instagram. */}
          {recent && recent.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4" aria-live="polite">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                <span aria-hidden="true" className="nav-dot" />
                Compras recientes
              </p>
              <div key={ri} className="menu-item mt-3 flex items-center gap-3" style={{ "--i": 0 } as React.CSSProperties}>
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                  {shown?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shown.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-sm text-white/70">
                    <strong className="font-semibold text-white">{shown?.name}</strong> compró
                  </span>
                  <span className="block truncate text-base font-semibold">{shown?.product}</span>
                  <span className="block text-xs text-white/50">{shown?.ago}</span>
                </span>
              </div>
              {recent.length > 1 && (
                <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
                  {recent.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${i === ri ? "w-5 bg-accent" : "w-1.5 bg-white/20"}`} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-4 text-sm font-semibold tracking-wide text-white transition active:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
              </svg>
              Síguenos en {siteConfig.instagramHandle}
            </a>
          )}
          <p className="mt-4 flex flex-wrap justify-center gap-x-1.5 text-center text-xs text-white/50">
            <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {siteConfig.instagramHandle}
            </a>
            <span>· {siteConfig.stats.instagramFollowers} seguidores · {siteConfig.city}</span>
          </p>
        </div>
      )}
    </header>
  );
}
