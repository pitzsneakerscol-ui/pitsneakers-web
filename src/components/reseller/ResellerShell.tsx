"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/revendedores/actions";

export type IconProps = { className?: string };
export const svg = (d: React.ReactNode) =>
  function Icon({ className = "h-5 w-5" }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        {d}
      </svg>
    );
  };

export const HomeIcon = svg(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></>);
export const BoxIcon = svg(<><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></>);
export const ChartIcon = svg(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>);
export const ChatIcon = svg(<><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9.5h8M8 12.5h5" /></>);
const TrophyIcon = svg(<><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v1.5A3.5 3.5 0 0 0 8 11M16 6h4v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20h7M10 17h4" /></>);
export const BellIcon = svg(<><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5l1.5-2Z" /><path d="M10 21h4" /></>);
export const UserIcon = svg(<><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c.9-3.6 3.8-5.4 7.5-5.4s6.6 1.8 7.5 5.4" /></>);
export const MoreIcon = svg(<><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>);
export const OutIcon = svg(<><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" /></>);

interface Item {
  href: string;
  label: string;
  Icon: (p: IconProps) => React.JSX.Element;
}

const MAIN: Item[] = [
  { href: "/revendedores/panel", label: "Inicio", Icon: HomeIcon },
  { href: "/revendedores/inventario", label: "Inventario", Icon: BoxIcon },
  { href: "/revendedores/ventas", label: "Ventas", Icon: ChartIcon },
  { href: "/revendedores/consultas", label: "Mercado", Icon: ChatIcon },
];
const MORE: Item[] = [
  { href: "/revendedores/ranking", label: "Ranking", Icon: TrophyIcon },
  { href: "/revendedores/avisos", label: "Avisos", Icon: BellIcon },
  { href: "/revendedores/cuenta", label: "Mi cuenta", Icon: UserIcon },
];

const TITLES: Record<string, string> = {
  panel: "Inicio",
  inventario: "Inventario",
  ventas: "Ventas",
  consultas: "Pregunta al mercado",
  ranking: "Ranking",
  avisos: "Avisos",
  cuenta: "Mi cuenta",
};

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="rsh-badge ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-none text-white">
      {n > 9 ? "9+" : n}
    </span>
  );
}

export default function ResellerShell({
  name,
  isAdmin,
  unread,
  children,
}: {
  name: string;
  isAdmin: boolean;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const section = pathname.split("/")[2] ?? "panel";
  const title = TITLES[section] ?? "Panel";
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  // La hoja "Más" del celular se cierra al cambiar de página.
  useEffect(() => {
    const t = setTimeout(() => setMore(false), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  const link = (it: Item) => (
    <Link
      key={it.href}
      href={it.href}
      aria-current={active(it.href) ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
        active(it.href) ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-ink"
      }`}
    >
      <it.Icon className="h-5 w-5 shrink-0" />
      {it.label}
      {it.href === "/revendedores/avisos" && <Badge n={unread} />}
    </Link>
  );

  return (
    <div className="theme-dark min-h-screen bg-paper text-ink lg:flex">
      {/* Barra lateral (escritorio) */}
      <aside className="hidden border-r border-line bg-paper-raised/70 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:px-4 lg:py-6">
        <Link href="/revendedores/panel" className="px-2 font-display text-2xl tracking-wide">
          PIT<span className="text-accent">SNEAKERS</span>
        </Link>
        <p className="mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">Revendedores</p>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Panel de revendedor">
          {[...MAIN, ...MORE].map((it) => link(it))}
          {isAdmin && (
            <Link href="/admin" className="mt-2 flex items-center gap-3 rounded-xl border border-accent/40 px-3.5 py-2.5 text-sm font-semibold text-accent hover:bg-accent/10">
              Ir a Admin
            </Link>
          )}
        </nav>

        <div className="mt-4 rounded-xl border border-line bg-paper p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{initial}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-[11px] text-muted">Sesión abierta</p>
            </div>
          </div>
          <form action={logout} className="mt-3">
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted transition hover:border-ink hover:text-ink">
              <OutIcon className="h-4 w-4" /> Salir
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur sm:px-6 lg:px-10">
          <Link href="/revendedores/panel" className="font-display text-xl tracking-wide lg:hidden">
            PIT<span className="text-accent">SNEAKERS</span>
          </Link>
          <p className="hidden font-display text-2xl tracking-wide lg:block">{title}</p>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/revendedores/consultas"
              className="hidden items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 sm:inline-flex"
            >
              <ChatIcon className="h-4 w-4" /> Preguntar al equipo
            </Link>
            <Link
              href="/revendedores/avisos"
              aria-label={unread > 0 ? `Avisos (${unread} sin leer)` : "Avisos"}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
            >
              <BellIcon className="h-5 w-5" />
              {unread > 0 && (
                <span className="rsh-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link href="/revendedores/cuenta" aria-label="Mi cuenta" className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white lg:hidden">
              {initial}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      {/* Barra de tareas inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Panel de revendedor">
        {MAIN.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active(it.href) ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition ${active(it.href) ? "text-accent" : "text-muted"}`}
          >
            <it.Icon className="h-6 w-6" />
            {it.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition ${more ? "text-accent" : "text-muted"}`}
        >
          <MoreIcon className="h-6 w-6" />
          Más
          {unread > 0 && <span className="rsh-badge absolute right-[28%] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />}
        </button>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button type="button" aria-label="Cerrar" onClick={() => setMore(false)} className="absolute inset-0 bg-black/60" />
          <div className="rsh-sheet absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-paper-raised p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              {MORE.map((it) => link(it))}
              {isAdmin && (
                <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-accent">
                  Ir a Admin
                </Link>
              )}
              <form action={logout}>
                <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted hover:text-ink">
                  <OutIcon className="h-5 w-5" /> Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
