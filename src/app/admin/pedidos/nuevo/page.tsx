import type { Metadata } from "next";
import Link from "next/link";
import { getAllProducts } from "@/lib/products";
import { isEmailConfigured } from "@/lib/email";
import SaleForm from "@/components/admin/SaleForm";
import type { SaleProduct } from "@/lib/sale-shared";

export const metadata: Metadata = { title: "Registrar venta" };

export default async function NuevaVentaPage() {
  const products: SaleProduct[] = (await getAllProducts()).map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    colorway: p.colorway ?? "",
    price: p.price,
    sizes: p.sizes,
    condition: p.condition,
    image: p.images[0] ?? "",
  }));

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/pedidos" className="text-xs font-semibold uppercase tracking-wide text-muted underline">← Pedidos web</Link>
        <h1 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">Registrar venta por WhatsApp</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Para ventas que cerraste fuera de la página. Eliges el par del catálogo (con su foto), pones los datos del cliente y el precio que acordaron: el pedido queda pagado y el cliente recibe el mismo proceso que quien compra en la web, con su enlace de seguimiento.
        </p>
      </header>
      <SaleForm products={products} emailOn={isEmailConfigured()} />
    </div>
  );
}
