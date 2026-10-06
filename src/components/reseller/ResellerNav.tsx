"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/revendedores/actions";

const TABS = [
  { href: "/revendedores/panel", label: "Panel" },
  { href: "/revendedores/inventario", label: "Inventario" },
  { href: "/revendedores/ventas", label: "Ventas" },
  { href: "/revendedores/cuenta", label: "Cuenta" },
];

export default function ResellerNav({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <div className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Panel de revendedor">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-4 py-4 text-xs font-semibold uppercase tracking-wider transition ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 py-2 text-xs text-muted">
          <span className="hidden sm:inline">
            Hola, <strong className="text-ink">{name}</strong>
          </span>
          <form action={logout}>
            <button type="submit" className="rounded-full border border-line px-3 py-1.5 font-semibold uppercase tracking-wide text-ink hover:border-ink">
              Salir
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
