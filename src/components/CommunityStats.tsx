"use client";

import { useEffect, useRef, useState } from "react";
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
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-6 text-center sm:py-0">
              <p className="font-display text-5xl tracking-wide text-accent sm:text-6xl">
                <OdometerValue value={stat.value} play={play} />
              </p>
              <p className="mt-2 text-xs uppercase tracking-widest text-white/60">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
