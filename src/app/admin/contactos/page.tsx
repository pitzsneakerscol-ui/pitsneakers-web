import type { Metadata } from "next";
import Link from "next/link";
import { contactStats, listContacts, PAGE_SIZE } from "@/lib/contacts";
import ContactImportForm from "@/components/admin/ContactImportForm";
import { btnGhost, btnPrimary, cardCls, inputCls, selectAutoCls } from "@/components/reseller/ui";
import { contactAction } from "./actions";

export const metadata: Metadata = { title: "Contactos" };
export const dynamic = "force-dynamic";

type Filter = "todos" | "activos" | "bajas";

export default async function ContactosPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; pag?: string }> }) {
  const { q = "", f = "todos", pag = "1" } = await searchParams;
  const filter: Filter = f === "activos" || f === "bajas" ? f : "todos";
  const query = q.trim().slice(0, 60);
  const stats = await contactStats();
  const { rows, total } = await listContacts({ q: query, filter, page: Math.max(1, Number(pag) || 1) });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(pag) || 1));

  const qs = (n: number) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (filter !== "todos") p.set("f", filter);
    if (n > 1) p.set("pag", String(n));
    const s = p.toString();
    return `/admin/contactos${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Contactos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Correos y celulares de la comunidad. Escríbeles desde “Enviar campaña de correo” (cada correo lleva su enlace de baja) o descarga el CSV para usarlo en Resend.
          </p>
        </div>
        {stats.active > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/contactos/campana" className={btnPrimary}>Enviar campaña de correo</Link>
            <a href="/admin/contactos/exportar" className={btnGhost}>Descargar CSV para Resend</a>
          </div>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Contactos</p>
          <p className="font-display text-4xl tracking-wide">{stats.total}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Activos</p>
          <p className="font-display text-4xl tracking-wide text-accent">{stats.active}</p>
          <p className="text-[11px] text-muted">Salen en el CSV</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Con celular</p>
          <p className="font-display text-4xl tracking-wide">{stats.withPhone}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Dados de baja</p>
          <p className="font-display text-4xl tracking-wide">{stats.unsubscribed}</p>
          <p className="text-[11px] text-muted">No se les escribe</p>
        </div>
      </div>

      <section className={`${cardCls} space-y-4 p-5`}>
        <h2 className="font-display text-2xl tracking-wide">Importar contactos</h2>
        <ContactImportForm />
      </section>

      <form method="get" className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input id="q" name="q" defaultValue={query} placeholder="Buscar por correo, nombre, celular o ciudad…" className={inputCls} />
        </div>
        <select name="f" defaultValue={filter} aria-label="Mostrar" className={selectAutoCls}>
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="bajas">Dados de baja</option>
        </select>
        <button type="submit" className={btnPrimary}>Filtrar</button>
        <Link href="/admin/contactos" className={btnGhost}>Limpiar</Link>
      </form>

      <p className="text-xs text-muted">
        {total} contacto{total === 1 ? "" : "s"} · página {page} de {pages}
      </p>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>
          {stats.total === 0 ? "Aún no hay contactos. Importa el CSV de la comunidad arriba." : "No hay contactos con ese filtro."}
        </div>
      ) : (
        <div className={`${cardCls} overflow-x-auto`}>
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Celular</th>
                <th className="px-4 py-3 font-semibold">Ciudad</th>
                <th className="px-4 py-3 font-semibold">Origen</th>
                <th className="px-4 py-3 font-semibold"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 font-medium">
                    {c.email}
                    {c.unsubscribed && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">Baja</span>}
                    {c.notes && <p className="mt-0.5 max-w-xs text-[11px] font-normal text-muted">{c.notes}</p>}
                  </td>
                  <td className="px-4 py-3">{c.name || <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.phone ? `+${c.phone}` : <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3">{c.city || <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-muted">{c.source}</td>
                  <td className="px-4 py-3">
                    <form action={contactAction} className="flex justify-end gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      {c.unsubscribed ? (
                        <button type="submit" name="action" value="reactivar" className={btnGhost}>Reactivar</button>
                      ) : (
                        <button type="submit" name="action" value="baja" className={btnGhost}>Dar de baja</button>
                      )}
                      <button type="submit" name="action" value="borrar" className={btnGhost} aria-label={`Borrar ${c.email}`}>Borrar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Páginas">
          {page > 1 ? <Link href={qs(page - 1)} className={btnGhost}>← Anterior</Link> : <span />}
          <span className="text-muted">Página {page} de {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className={btnGhost}>Siguiente →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
