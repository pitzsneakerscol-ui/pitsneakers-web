"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import OdometerValue from "@/components/OdometerValue";

const stats = [
  { value: siteConfig.stats.whatsappMembers, label: "Miembros en WhatsApp" },
  { value: siteConfig.stats.instagramFollowers, label: "Seguidores en Instagram" },
  { value: `${siteConfig.stats.whatsappGroups}`, label: "Grupos activos de la comunidad" },
];

export default function CommunityStats() {
  const sectionRef = useRef<HTMLElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlay(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Sobre nosotros</p>
          <h2 className="mt-3 font-display text-3xl tracking-wide text-balance sm:text-4xl">
            MÁS QUE UNA TIENDA, <span className="text-accent">UNA COMUNIDAD</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
            Nacimos en {siteConfig.city} como grupos de WhatsApp donde la gente compraba, vendía e
            intercambiaba sneakers. Seguimos igual de cerca, pero ahora cada par pasa por
            verificación antes de llegar a tus manos.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-6 text-center sm:py-0">
              <p className="font-display text-5xl tracking-wide text-accent sm:text-6xl">
                <OdometerValue value={stat.value} play={play} />
              </p>
              <p className="mt-2 text-xs uppercase tracking-widest text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/verificacion"
            className="btn-pop inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-3.5 text-xs font-semibold uppercase tracking-wide text-white hover:border-accent hover:text-accent"
          >
            Cómo trabajamos
          </Link>
        </div>
      </div>
    </section>
  );
}
