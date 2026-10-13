"use client";

import { useActionState } from "react";
import { addAuctionItem, announceAuction, saveAuction } from "@/app/admin/subasta/actions";
import { btnAccent, btnPrimary, inputCls, labelCls, submitWith } from "@/components/reseller/ui";

function Notice({ state }: { state: { ok?: boolean; error?: string; message?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">{state.message}</p>;
  return null;
}

/** Título, fechas y publicación de la subasta. */
export function AuctionForm({ id, title, starts, ends, published }: { id?: number; title: string; starts: string; ends: string; published: boolean }) {
  const [state, action, pending] = useActionState(saveAuction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div>
        <label htmlFor="au-title" className={labelCls}>Título</label>
        <input id="au-title" name="title" defaultValue={title} maxLength={80} className={inputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="au-start" className={labelCls}>Abre (hora de Colombia)</label>
          <input id="au-start" name="starts" type="datetime-local" required defaultValue={starts} className={inputCls} />
        </div>
        <div>
          <label htmlFor="au-end" className={labelCls}>Cierra (hora de Colombia)</label>
          <input id="au-end" name="ends" type="datetime-local" required defaultValue={ends} className={inputCls} />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="published" value="1" defaultChecked={published} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
        <span>
          <strong>Publicada</strong> — los inscritos con pase ya pueden ver los pares (y pujar cuando llegue la hora de apertura).
        </span>
      </label>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Guardando…" : id ? "Guardar cambios" : "Crear subasta"}</button>
    </form>
  );
}

/** Agrega un par a la subasta. */
export function ItemForm({ auctionId }: { auctionId: number }) {
  const [state, action, pending] = useActionState(addAuctionItem, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <input type="hidden" name="auction_id" value={auctionId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="it-image" className={labelCls}>Foto: SKU del catálogo o enlace https</label>
          <input id="it-image" name="image" required placeholder="AJ1-08  o  https://i.postimg.cc/…" className={inputCls} />
          <p className="mt-1.5 text-xs text-muted">Con un SKU del catálogo, el nombre, la marca y la talla se llenan solos (si los dejas vacíos).</p>
        </div>
        <div>
          <label htmlFor="it-name" className={labelCls}>Nombre</label>
          <input id="it-name" name="name" maxLength={80} placeholder="Jordan 1 High Volt" className={inputCls} />
        </div>
        <div>
          <label htmlFor="it-brand" className={labelCls}>Marca</label>
          <input id="it-brand" name="brand" maxLength={60} placeholder="Jordan" className={inputCls} />
        </div>
        <div>
          <label htmlFor="it-size" className={labelCls}>Talla</label>
          <input id="it-size" name="size" maxLength={30} placeholder="9 US" className={inputCls} />
        </div>
        <div>
          <label htmlFor="it-cond" className={labelCls}>Condición</label>
          <select id="it-cond" name="condition" className={inputCls} defaultValue="nuevo">
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
          </select>
        </div>
        <div>
          <label htmlFor="it-start" className={labelCls}>Precio de salida (COP)</label>
          <input id="it-start" name="start_price" required inputMode="numeric" placeholder="300000" className={inputCls} />
        </div>
        <div>
          <label htmlFor="it-inc" className={labelCls}>Incremento mínimo (COP)</label>
          <input id="it-inc" name="increment" inputMode="numeric" defaultValue="20000" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="it-desc" className={labelCls}>Detalle (opcional)</label>
          <input id="it-desc" name="description" maxLength={200} placeholder="Nuevo con caja, 100% auténtico" className={inputCls} />
        </div>
      </div>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={btnAccent}>{pending ? "Agregando…" : "Agregar par"}</button>
    </form>
  );
}

/** Correo a la lista de espera avisando la fecha. */
export function AnnounceForm({ auctionId, pendingCount }: { auctionId: number; pendingCount: number }) {
  const [state, action, pending] = useActionState(announceAuction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-3">
      <input type="hidden" name="auction_id" value={auctionId} />
      <Notice state={state} />
      <button type="submit" disabled={pending || pendingCount === 0} className={btnAccent}>
        {pending ? "Enviando… (puede tardar un poco)" : pendingCount === 0 ? "Todos avisados" : `Avisar a la lista (${pendingCount} sin avisar)`}
      </button>
      <p className="text-xs text-muted">Envía de a 40 correos por clic. Si hay más, pulsa de nuevo hasta que diga “Todos avisados”.</p>
    </form>
  );
}
