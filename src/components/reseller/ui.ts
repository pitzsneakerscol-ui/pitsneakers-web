import { startTransition, type FormEvent } from "react";

export const labelCls =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted";

export const inputCls =
  "w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-ink/10";

export const selectAutoCls =
  "rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50";

export const btnAccent =
  "inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink transition hover:border-ink disabled:opacity-50";

export const cardCls = "rounded-xl border border-line bg-paper-raised";


/**
 * React 19 limpia los campos del formulario cuando una acción termina (incluso
 * con error), y el usuario perdería lo que escribió. Enviamos el FormData a mano
 * dentro de una transición para conservar los valores.
 */
export function submitWith(action: (payload: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
