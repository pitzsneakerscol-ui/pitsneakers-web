"use client";

import ShippingFields from "@/components/ShippingFields";
import { DELIVERY_FEE, type Delivery } from "@/lib/delivery-shared";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/config/site";
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
          <span className="text-[11px] opacity-75">{formatPrice(DELIVERY_FEE)} · todo el país</span>
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
      <p hidden={mode !== "recogida"} className="rounded-xl border border-line bg-paper px-3.5 py-3 text-sm">
        Recoges tu par en nuestro punto de verificación en {siteConfig.verificationPoint.city}, sin costo de envío. Cuando pagues te mostramos la dirección y coordinamos contigo el día y la hora por WhatsApp.
      </p>
    </div>
  );
}
