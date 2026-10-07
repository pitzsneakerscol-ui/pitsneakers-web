"use client";

import { useEffect, useState } from "react";

/** En celular: botón fijo "Crear mi cuenta" que lleva al formulario, y se esconde cuando ya lo estás viendo. */
export default function JoinBar() {
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById("registro");
    if (!form || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { threshold: 0.2 });
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 z-40 px-4 transition duration-300 lg:hidden ${formVisible ? "pointer-events-none translate-y-6 opacity-0" : "opacity-100"}`}
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={() => document.getElementById("registro")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        className="btn-pop btn-shine rs-ring relative mx-auto flex w-full max-w-sm items-center justify-center rounded-full bg-accent px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg"
      >
        Crear mi cuenta gratis
      </button>
    </div>
  );
}
