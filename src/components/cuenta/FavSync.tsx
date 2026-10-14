"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { syncWithAccount } from "@/lib/favorites";

/** Si hay un comprador con sesión, junta sus favoritos del navegador con los de su cuenta. No dibuja nada. */
export default function FavSync() {
  const pathname = usePathname();
  useEffect(() => {
    let live = true;
    fetch("/api/cuenta/favoritos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { in?: boolean; id?: number; slugs?: string[] } | null) => {
        if (live && d?.in && typeof d.id === "number" && Array.isArray(d.slugs)) syncWithAccount(d.slugs, d.id);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pathname]);
  return null;
}
