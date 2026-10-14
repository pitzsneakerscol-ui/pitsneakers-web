"use client";

/** Alterna el modo noche del sitio público. La preferencia se guarda en este navegador (localStorage) y se aplica antes de pintar (ver layout). */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const dark = !root.classList.contains("site-dark");
    root.classList.toggle("site-dark", dark);
    try {
      localStorage.setItem("pits-theme", dark ? "dark" : "light");
    } catch {
      /* sin almacenamiento: el cambio vale solo para esta visita */
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar entre modo día y modo noche"
      title="Modo noche"
      className={`theme-toggle inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 text-white transition hover:border-white hover:bg-white/10 ${className}`}
    >
      <svg className="tt-moon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
      </svg>
      <svg className="tt-sun" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </svg>
    </button>
  );
}
