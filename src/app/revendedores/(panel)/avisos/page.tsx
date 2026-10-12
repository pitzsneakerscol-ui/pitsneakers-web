import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { readAllNotifications } from "@/app/revendedores/market-actions";
import { ago } from "@/lib/admin-shared";
import { cardCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Avisos" };

const ICON: Record<string, string> = { inventario: "📦", consulta: "💬", info: "🔔" };

export default async function AvisosPage() {
  const user = await requireUser();
  const items = user.isAdmin ? [] : await listNotifications(user.id);
  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Avisos</h1>
          <p className="mt-2 text-sm text-muted">Lo que cambia en tu inventario y las respuestas del equipo, en un solo lugar.</p>
        </div>
        {unread > 0 && (
          <form action={readAllNotifications}>
            <button type="submit" className="rounded-full border border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink transition hover:border-ink">
              Marcar todo como leído
            </button>
          </form>
        )}
      </header>

      {items.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center`}>
          <p className="text-4xl" aria-hidden="true">🔔</p>
          <p className="mt-2 font-display text-2xl tracking-wide">Todo al día</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Cuando te carguemos pares o respondamos una consulta, te avisamos aquí.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const inner = (
              <div className={`${cardCls} flex items-start gap-3 p-4 transition hover:border-ink/40 ${n.read ? "opacity-70" : "border-accent/50"}`}>
                <span className="text-2xl" aria-hidden="true">{ICON[n.kind] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {n.title}
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Sin leer" />}
                  </p>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{ago(n.createdAt)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
