import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
      <p className="font-display text-7xl tracking-wide text-accent">404</p>
      <h1 className="mt-4 font-display text-2xl tracking-wide">
        No encontramos esta página
      </h1>
      <p className="mt-3 text-sm text-muted">
        El producto o la página que buscas ya no está disponible.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-ink px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-ink/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
