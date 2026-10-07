"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

type IconProps = { className?: string };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M3 11l9-8 9 8M5 9.5V21h14V9.5" />
    </svg>
  );
}
function ShoeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M2 16.5V12l5 1 3-3 2 1.5c1 .8 2.300 1.300 3.600 1.500L21 14v2.500a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" />
      <path d="M10 13.500l1.500-1.500M13 15l1.200-1.200" />
    </svg>
  );
}
function ShirtIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0Z" />
    </svg>
  );
}
function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.300-4.300" />
    </svg>
  );
}
function SellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v1a3 3 0 0 0 6 0M9 10a3 3 0 0 0 6 0M15 10a3 3 0 0 0 6 0V9M5 13v8h14v-8" />
    </svg>
  );
}
function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M21 12a8.5 8.5 0 0 1-12.600 7.400L3 21l1.600-5.200A8.500 8.500 0 1 1 21 12Z" />
    </svg>
  );
}

// El panel de dueño y el de revendedores tienen su propia navegación.
// (La página pública /revendedores sí lleva barra; sus paneles internos no.)
const HIDDEN_PREFIXES = ["/admin", "/revendedores/"];

export default function MobileTabBar({ sellEnabled = false }: { sellEnabled?: boolean }) {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const tabs: { key: string; label: string; href?: string; icon: React.ReactNode; external?: boolean; match: (p: string) => boolean }[] = [
    { key: "home", label: "Inicio", href: "/", icon: <HomeIcon className="h-6 w-6" />, match: (p) => p === "/" },
    { key: "sneakers", label: "Sneakers", href: "/sneakers", icon: <ShoeIcon className="h-6 w-6" />, match: (p) => p.startsWith("/sneakers") },
    { key: "streetwear", label: "Ropa", href: "/streetwear", icon: <ShirtIcon className="h-6 w-6" />, match: (p) => p.startsWith("/streetwear") },
    { key: "search", label: "Buscar", icon: <SearchIcon className="h-6 w-6" />, match: () => false },
    sellEnabled
      ? {
          key: "sell",
          label: "Vende",
          href: "/revendedores",
          icon: <SellIcon className="h-6 w-6" />,
          match: (p) => p === "/revendedores",
        }
      : {
          key: "wa",
          label: "WhatsApp",
          href: buildGeneralWhatsAppLink("Hola! Quiero más información sobre Pitsneakers"),
          external: true,
          icon: <ChatIcon className="h-6 w-6" />,
          match: () => false,
        },
  ];

  const itemCls = (active: boolean) =>
    `relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition active:scale-95 ${active ? "text-accent" : "text-white/70"}`;

  return (
    <>
      {/* Espacio para que la barra no tape el final de la página. */}
      <div aria-hidden="true" className="h-16 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-lg">
          {tabs.map((t) => {
            const active = t.match(pathname);
            const inner = (
              <>
                <span className="relative">
                  {t.icon}
                  {active ? <span className="nav-dot absolute -right-2 -top-1" style={{ ["--glow" as string]: "#25d366" }} /> : null}
                </span>
                {t.label}
              </>
            );
            return (
              <li key={t.key} className="flex flex-1">
                {t.href ? (
                  t.external ? (
                    <a href={t.href} target="_blank" rel="noopener noreferrer" className={itemCls(false)}>
                      {inner}
                    </a>
                  ) : (
                    <Link href={t.href} aria-current={active ? "page" : undefined} className={itemCls(active)}>
                      {inner}
                    </Link>
                  )
                ) : (
                  <button type="button" onClick={() => window.dispatchEvent(new Event("pit:open-search"))} className={itemCls(false)}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
