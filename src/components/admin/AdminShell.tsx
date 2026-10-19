"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/revendedores/actions";
import { BoxIcon, ChartIcon, ChatIcon, HomeIcon, MoreIcon, OutIcon, TagIcon, UserIcon, svg, type IconProps } from "@/components/reseller/ResellerShell";

const WalletIcon = svg(<><path d="M3.5 7.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" /><path d="M3.5 7.5 16 4.5v3M16 13.5h4.5" /></>);
const UsersIcon = svg(<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 19c.8-3.3 3.2-5 6.5-5s5.7 1.7 6.5 5" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.2c1.8.5 3 2 3.5 4.8" /></>);
const MailIcon = svg(<><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m4 7.5 8 6 8-6" /></>);
const DocIcon = svg(<><path d="M6 3.5h8l4 4V20.5H6V3.5Z" /><path d="M14 3.5v4h4M9 12h6M9 15.5h6" /></>);
const GiftIcon = svg(<><rect x="3.5" y="8.5" width="17" height="4" rx="1" /><path d="M5 12.5v7h14v-7M12 8.5v11M12 8.5c-2.5 0-4.5-.8-4.5-2.5S10 4 12 8.5c2-4.5 4.5-3.2 4.5-1.5s-2 2.5-4.5 2.5Z" /></>);
const GavelIcon = svg(<><path d="m13.5 4.5 6 6M10 8l6 6M6.5 11.5l6 6" /><path d="m9 6.5 3-3 6 6-3 3M4 20.5h9M5.5 13l-2 2 5.5 5.5 2-2" /></>);
const PlayIcon = svg(<><circle cx="12" cy="12" r="8.5" /><path d="m10 8.5 5.5 3.5-5.5 3.5v-7Z" /></>);
const ReceiptIcon = svg(<><path d="M5 3.5h14v17l-2.3-1.6-2.3 1.6-2.4-1.6-2.4 1.6-2.3-1.6L5 20.5v-17Z" /><path d="M8.5 8.5h7M8.5 12h7" /></>);

interface Item {
  href: string;
  label: string;
  Icon: (p: IconProps) => React.JSX.Element;
}

const MAIN: Item[] = [
  { href: "/admin", label: "Resumen", Icon: HomeIcon },
  { href: "/admin/revendedores", label: "Vendedores", Icon: UserIcon },
  { href: "/admin/inventario", label: "Inventario", Icon: BoxIcon },
  { href: "/admin/consultas", label: "Consultas", Icon: ChatIcon },
];
const MORE: Item[] = [
  { href: "/admin/pedidos", label: "Pedidos web", Icon: ReceiptIcon },
  { href: "/admin/ofertas", label: "Ofertas", Icon: TagIcon },
  { href: "/admin/ofertas-clientes", label: "Ofertas de clientes", Icon: TagIcon },
  { href: "/admin/ventas", label: "Ventas", Icon: ChartIcon },
  { href: "/admin/pagos", label: "Pagos", Icon: WalletIcon },
  { href: "/admin/compradores", label: "Compradores", Icon: UsersIcon },
  { href: "/admin/lista-espera", label: "Lista de espera", Icon: GiftIcon },
  { href: "/admin/subasta", label: "Subasta", Icon: GavelIcon },
  { href: "/admin/trivia", label: "Trivia", Icon: PlayIcon },
  { href: "/admin/resenas", label: "Reseñas", Icon: ChatIcon },
  { href: "/admin/correos", label: "Correos", Icon: MailIcon },
  { href: "/admin/plantillas", label: "Plantillas", Icon: DocIcon },
];

const TITLES: Record<string, string> = {
  "": "Resumen del dueño",
  revendedores: "Vendedores",
  inventario: "Inventario global",
  ventas: "Ventas",
  consultas: "Consultas de mercado",
  ofertas: "Ofertas",
  "ofertas-clientes": "Ofertas de clientes",
  pedidos: "Pedidos web",
  pagos: "Pagos",
  compradores: "Compradores",
  "lista-espera": "Lista de espera",
  subasta: "Subasta",
  trivia: "Trivia en vivo",
  correos: "Correos",
  plantillas: "Plantillas",
  resenas: "Reseñas de clientes",
};

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="rsh-badge ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-none text-white">
      {n > 9 ? "9+" : n}
    </span>
  );
}

/** Panel del dueño: mismo estilo oscuro del panel de revendedores (barra lateral en computador, barra de tareas en celular). */
export default function AdminShell({ pending, reviewsPending = 0, children }: { pending: number; reviewsPending?: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  const title = TITLES[pathname.split("/")[2] ?? ""] ?? "Administración";

  useEffect(() => {
    const t = setTimeout(() => setMore(false), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  const link = (it: Item) => (
    <Link
      key={it.href}
      href={it.href}
      aria-current={active(it.href) ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
        active(it.href) ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-ink"
      }`}
    >
      <it.Icon className="h-5 w-5 shrink-0" />
      {it.label}
      {it.href === "/admin/consultas" && <Badge n={pending} />}
      {it.href === "/admin/resenas" && <Badge n={reviewsPending} />}
    </Link>
  );

  return (
    <div className="theme-dark min-h-screen bg-paper text-ink lg:flex">
      <aside className="hidden border-r border-line bg-paper-raised/70 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:px-4 lg:py-6">
        <Link href="/admin" className="px-2 font-display text-2xl tracking-wide">
          PIT<span className="text-accent">SNEAKERS</span>
        </Link>
        <p className="mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">Dueño</p>
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Administración">
          {[...MAIN, ...MORE].map((it) => link(it))}
          <Link href="/revendedores/panel" className="mt-2 flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-muted hover:border-ink hover:text-ink">
            <ReceiptIcon className="h-5 w-5" /> Ver como vendedor
          </Link>
        </nav>
        <div className="mt-4 rounded-xl border border-line bg-paper p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">P</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Pitsneakers</p>
              <p className="text-[11px] text-muted">Cuenta del dueño</p>
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur sm:px-6 lg:px-10">
          <Link href="/admin" className="font-display text-xl tracking-wide lg:hidden">
            PIT<span className="text-accent">SNEAKERS</span>
          </Link>
          <p className="hidden font-display text-2xl tracking-wide lg:block">{title}</p>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/consultas"
              aria-label={pending > 0 ? `Consultas pendientes: ${pending}` : "Consultas"}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line transition hover:border-ink"
            >
              <ChatIcon className="h-5 w-5" />
              {pending > 0 && (
                <span className="rsh-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-white">
                  {pending > 9 ? "9+" : pending}
                </span>
              )}
            </Link>
            <span className="hidden rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white sm:inline">Dueño</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Administración">
        {MAIN.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active(it.href) ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition ${active(it.href) ? "text-accent" : "text-muted"}`}
          >
            <it.Icon className="h-6 w-6" />
            {it.label}
            {it.href === "/admin/consultas" && pending > 0 && <span className="rsh-badge absolute right-[24%] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition ${more ? "text-accent" : "text-muted"}`}
        >
          <MoreIcon className="h-6 w-6" />
          Más
        </button>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
          <button type="button" aria-label="Cerrar" onClick={() => setMore(false)} className="absolute inset-0 bg-black/60" />
          <div className="rsh-sheet absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-paper-raised p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              {MORE.map((it) => link(it))}
              <Link href="/revendedores/panel" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted hover:text-ink">
                <ReceiptIcon className="h-5 w-5" /> Ver como vendedor
              </Link>
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
