import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers, listPayments } from "@/lib/admin";
import { deleteCustomer } from "@/app/admin/actions";
import { waLink } from "@/lib/admin-shared";
import { formatPrice } from "@/lib/format";
import { btnGhost, cardCls } from "@/components/reseller/ui";
import ConfirmForm from "@/components/admin/ConfirmForm";
import CustomerForm from "@/components/admin/CustomerForm";

export const metadata: Metadata = { title: "Compradores" };

export default async function CustomersPage() {
  const [customers, pending] = await Promise.all([listCustomers(), listPayments("pendiente")]);
  const owedBy = new Map<number, number>();
  for (const p of pending) {
    if (p.partyType === "customer") owedBy.set(p.partyId, (owedBy.get(p.partyId) ?? 0) + p.amount);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Compradores</h1>
        <p className="mt-2 text-sm text-muted">Tu libreta de clientes: contacto, pagos pendientes y correos.</p>
      </header>

      <details className={`${cardCls} p-5 sm:p-6`} open={customers.length === 0}>
        <summary className="cursor-pointer font-display text-2xl tracking-wide">Agregar comprador</summary>
        <div className="mt-5"><CustomerForm /></div>
      </details>

      {customers.length === 0 ? (
        <div className={`${cardCls} px-6 py-12 text-center`}>
          <p className="font-display text-2xl tracking-wide">Aún no tienes compradores guardados</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Agrégalos para registrarles pagos y enviarles correos con plantillas.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {customers.map((c) => {
            const owed = owedBy.get(c.id) ?? 0;
            return (
              <li key={c.id} className={`${cardCls} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted">
                      {c.email || "Sin correo"}
                      {c.whatsapp && (
                        <>
                          {" · "}
                          <a href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="underline">+{c.whatsapp}</a>
                        </>
                      )}
                    </p>
                    {c.notes && <p className="mt-1 text-xs text-muted">{c.notes}</p>}
                  </div>
                  {owed > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Debe {formatPrice(owed)}</span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
                  {c.email && <Link href={`/admin/correos?cli=${c.id}`} className={btnGhost}>Enviar correo</Link>}
                  <Link href={`/admin/pagos?nuevo=c:${c.id}`} className={btnGhost}>Registrar pago</Link>
                  <ConfirmForm
                    action={deleteCustomer}
                    fields={{ id: c.id }}
                    label="Borrar"
                    confirm={owed > 0 ? "Este comprador tiene pagos pendientes: no se puede borrar hasta cerrarlos." : `¿Borrar a ${c.name}?`}
                    className={`${btnGhost} text-accent hover:border-accent`}
                  />
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink">Editar</summary>
                  <div className="mt-4"><CustomerForm customer={c} /></div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
