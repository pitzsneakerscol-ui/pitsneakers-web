"use client";

import ShippingFields from "@/components/ShippingFields";
import { DELIVERY_FEE, type Delivery } from "@/lib/delivery-shared";
import { freeShippingLive } from "@/lib/sale";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { inputCls, labelCls } from "@/components/reseller/ui";
import type { ShippingData } from "@/lib/shipping-shared";

const opt = "flex cursor-pointer flex-col rounded-xl border border-line bg-paper px-3 py-2.5 text-left transition has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:ring-1 has-[:checked]:ring-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent";

/**
 * Cómo recibe el comprador su pedido: envío a domicilio (con su costo) o recogida gratis en el punto de verificación de Bogotá.
 * Los campos de dirección se desactivan al recoger, así el navegador no los exige. Los nombres coinciden con `parseDelivery`.
 */
export default function DeliveryFields({ idPrefix, mode, onMode, defaults }: { idPrefix: string; mode: Delivery; onMode: (m: Delivery) => void; defaults?: Partial<ShippingData> }) {
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="¿Cómo quieres recibir tu pedido?" className="grid grid-cols-2 gap-2">
        <label className={opt}>
          <input type="radio" name="delivery" value="envio" checked={mode === "envio"} onChange={() => onMode("envio")} className="sr-only" />
          <span className="text-sm font-semibold">Envío a domicilio</span>
          <span className="text-[11px] opacity-75">{freeShippingLive() ? "Gratis por Black Friday" : formatPrice(DELIVERY_FEE)} · todo el país</span>
        </label>
        <label className={opt}>
          <input type="radio" name="delivery" value="recogida" checked={mode === "recogida"} onChange={() => onMode("recogida")} className="sr-only" />
          <span className="text-sm font-semibold">Recoger en {siteConfig.verificationPoint.city}</span>
          <span className="text-[11px] opacity-75">Gratis · punto de verificación</span>
        </label>
      </div>
      {/* Los dos bloques quedan montados para no perder lo escrito al cambiar de pestaña; el que no se usa va oculto y desactivado (no se valida ni se envía). */}
      <div hidden={mode !== "envio"}>
        <fieldset disabled={mode !== "envio"} className="min-w-0">
          <ShippingFields idPrefix={idPrefix} defaults={defaults} />
        </fieldset>
      </div>
      <div hidden={mode !== "recogida"}>
        <fieldset disabled={mode !== "recogida"} className="min-w-0 space-y-3 rounded-xl border border-line bg-paper p-3.5">
          <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Quién recoge</legend>
          <p className="text-sm">
            Recoges tu par en nuestro punto de verificación en {siteConfig.verificationPoint.city}, sin costo de envío. Cuando pagues te mostramos la dirección y coordinamos contigo el día y la hora por WhatsApp.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${idPrefix}-pname`} className={labelCls}>Nombre completo de quien recoge</label>
              <input id={`${idPrefix}-pname`} name="pickupName" required autoComplete="off" maxLength={80} placeholder="Puedes ser tú u otra persona" className={inputCls} />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-pdoc`} className={labelCls}>Cédula de quien recoge</label>
              <input id={`${idPrefix}-pdoc`} name="pickupDocument" required inputMode="numeric" autoComplete="off" maxLength={14} placeholder="Solo números" className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-muted">Quien llegue por el par debe mostrar esa cédula. Si cambia la persona, avísanos por WhatsApp antes.</p>
        </fieldset>
      </div>
    </div>
  );
}
