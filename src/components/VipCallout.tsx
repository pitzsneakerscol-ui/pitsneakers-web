import Link from "next/link";
import VipShowcase, { type VipItem } from "@/components/VipShowcase";

// Los pares que se consiguen por encargo (fotos sobre blanco en public/vip; no son parte del catálogo).
const GRAILS: VipItem[] = [
  { slug: "lv-af1-red", brand: "Louis Vuitton x Nike", name: "Air Force 1 Low Rojo", image: "/vip/lv-af1-red.webp" },
  { slug: "air-mag", brand: "Nike", name: "Air Mag", image: "/vip/air-mag.webp" },
  { slug: "af1-panda", brand: "Nike", name: "Air Force 1 Low Panda", image: "/vip/af1-panda.webp" },
];

export default function VipCallout() {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-ink px-6 py-10 text-white sm:px-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <VipShowcase items={GRAILS} />

      <p className="relative mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
        Servicio VIP
      </p>
      <h2 className="relative mt-3 font-display text-3xl leading-[1] tracking-wide text-balance sm:text-4xl">
        ¿NO ENCUENTRAS TU PAR? <span className="text-accent">PÍDELO POR ENCARGO.</span>
      </h2>
      <p className="relative mt-4 max-w-md text-sm text-white/70 sm:text-base">
        Activamos nuestra red y toda la comunidad para conseguirte esos pares
        difíciles, antes de que salgan al público.
      </p>
      <div className="relative mt-7">
        <Link
          href="/encargos"
          className="btn-pop inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-ink hover:bg-white/90"
        >
          Conocer el servicio
        </Link>
      </div>
    </div>
  );
}
