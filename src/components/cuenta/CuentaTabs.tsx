"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/cuenta", label: "Colección" },
  { href: "/cuenta/deseos", label: "Deseos" },
  { href: "/cuenta/ofertas", label: "Ofertas" },
  { href: "/cuenta/perfil", label: "Perfil" },
];

/** Pestañas de Mi cuenta. `alerts` marca "Ofertas" cuando hay algo que responder o pagar. */
export default function CuentaTabs({ alerts }: { alerts: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Mi cuenta" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1 pb-px">
      {TABS.map((t) => {
        const active = t.href === "/cuenta" ? path === "/cuenta" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`relative shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
            {t.label === "Ofertas" && alerts > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">{alerts}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
