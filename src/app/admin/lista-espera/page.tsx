import type { Metadata } from "next";
import { listWaitlist } from "@/lib/waitlist";
import { ago } from "@/lib/admin-shared";
import { prelaunch } from "@/config/prelaunch";
import { btnGhost, cardCls } from "@/components/reseller/ui";

export const metadata: Metadata = { title: "Lista de espera" };

export default async function ListaEsperaPage() {
  const rows = await listWaitlist();
  const locked = process.env.SITE_LOCKED === "1";
  const today = new Date().toDateString();
  const todayCount = rows.filter((r) => new Date(r.createdAt).toDateString() === today).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Lista de espera</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Correos de quienes se inscribieron en la página “Próximamente”. Cada uno recibió un código personal de {prelaunch.discountPercent}% de descuento en su primera compra.
          </p>
        </div>
        {rows.length > 0 && (
          <a href="/admin/lista-espera/exportar" className={btnGhost}>Descargar CSV</a>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Inscritos</p>
          <p className="font-display text-4xl tracking-wide text-accent">{rows.length}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Hoy</p>
          <p className="font-display text-4xl tracking-wide">{todayCount}</p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Candado del sitio</p>
          <p className={`font-display text-4xl tracking-wide ${locked ? "text-accent" : ""}`}>{locked ? "Activo" : "Apagado"}</p>
          <p className="text-[11px] text-muted">{locked ? "El público solo ve “Próximamente”." : "El sitio está abierto a todos."}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={`${cardCls} px-6 py-14 text-center text-sm text-muted`}>Aún no hay inscritos.</div>
      ) : (
        <div className={`${cardCls} overflow-x-auto`}>
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Inscrito</th>
                <th className="px-4 py-3 font-semibold">Correo enviado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{r.email}</td>
                  <td className="px-4 py-3 font-mono text-xs tracking-wider">{r.code}</td>
                  <td className="px-4 py-3 text-muted">{ago(r.createdAt)}</td>
                  <td className="px-4 py-3 text-muted">{r.welcomed ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
