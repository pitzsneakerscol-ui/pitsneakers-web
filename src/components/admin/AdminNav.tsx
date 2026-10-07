"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/revendedores/actions";

const TABS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/revendedores", label: "Revendedores" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/compradores", label: "Compradores" },
  { href: "/admin/correos", label: "Correos" },
  { href: "/admin/plantillas", label: "Plantillas" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-line bg-ink text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Administración">
          {TABS.map((t) => {
            const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-4 py-4 text-xs font-semibold uppercase tracking-wider transition ${active ? "border-accent text-white" : "border-transparent text-white/60 hover:text-white"}`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 py-2 text-xs">
          <span className="hidden rounded-full bg-accent px-2.5 py-1 font-semibold uppercase tracking-wider sm:inline">Dueño</span>
          <form action={logout}>
            <button type="submit" className="rounded-full border border-white/30 px-3 py-1.5 font-semibold uppercase tracking-wide hover:border-white">
              Salir
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
