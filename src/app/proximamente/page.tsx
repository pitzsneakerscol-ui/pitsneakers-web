import type { Metadata } from "next";
import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import { prelaunch } from "@/config/prelaunch";
import { siteConfig } from "@/config/site";
import { buildGeneralWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Próximamente",
  description: `Estamos preparando la nueva ${siteConfig.name}. Deja tu correo y entra a la subasta exclusiva de ${prelaunch.auctionPairs} pares.`,
  robots: { index: false, follow: false },
};

const BRANDS = ["Jordan", "Nike", "Yeezy", "New Balance", "Adidas", "Asics", "Supreme", "Dunk SB", "Travis Scott", "Bad Bunny"];

export default function ProximamentePage() {
  const n = prelaunch.auctionPairs;
  return (
    <div className="theme-dark pl-root relative isolate flex min-h-screen flex-col overflow-hidden bg-paper text-ink">
      <div className="pl-glow" aria-hidden="true" />
      <div className="pl-stripes" aria-hidden="true" />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <span className="font-display text-2xl tracking-wide sm:text-3xl">
          PIT<span className="text-accent">SNEAKERS</span>
        </span>
        <Link href="/revendedores/ingresar" className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/80 transition hover:border-white hover:text-white">
          Soy revendedor
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 pb-10 pt-4 text-center sm:px-8">
        <span className="pl-pill inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
          <span className="pl-dot" aria-hidden="true" /> Muy pronto
        </span>
        <h1 className="mt-5 font-display text-5xl leading-[1.02] tracking-wide sm:text-7xl">
          La nueva <span className="text-accent">Pitsneakers</span> está por salir
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/70 sm:text-lg">
          Sneakers y streetwear verificados, de la comunidad de {siteConfig.stats.whatsappMembers} en WhatsApp. Deja tu correo y entras primero.
        </p>

        <div className="mt-8 w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur sm:p-6">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">🔨 Por inscribirte ganas</p>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            {prelaunch.perks.map((p, i) => (
              <li key={p} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">{i === 0 ? n : "✓"}</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <WaitlistForm />
          </div>
        </div>
      </main>

      <div className="pl-marquee relative z-10 border-y border-white/10 py-3" aria-hidden="true">
        <div className="pl-track">
          {[...BRANDS, ...BRANDS, ...BRANDS, ...BRANDS].map((b, i) => (
            <span key={i} className="font-display text-xl tracking-widest text-white/30">{b} <span className="text-accent/70">•</span> </span>
          ))}
        </div>
      </div>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-5 text-xs text-white/60">
        <a href={buildGeneralWhatsAppLink("Hola! Quiero info sobre Pitsneakers")} className="hover:text-white" target="_blank" rel="noreferrer">WhatsApp</a>
        <a href={siteConfig.instagramUrl} className="hover:text-white" target="_blank" rel="noreferrer">Instagram {siteConfig.instagramHandle}</a>
        <span>{siteConfig.city}</span>
      </footer>
    </div>
  );
}
