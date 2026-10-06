import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listItems } from "@/lib/reseller";
import { todayBogota } from "@/lib/reseller-shared";
import { getCatalogEntries } from "@/lib/reseller-catalog";
import AddItemsPanel from "@/components/reseller/AddItemsPanel";
import InventoryTable from "@/components/reseller/InventoryTable";
import ImportForm from "@/components/reseller/ImportForm";

export const metadata: Metadata = { title: "Mi inventario" };

export default async function InventarioPage() {
  const user = await requireUser();
  const [items, catalog] = await Promise.all([listItems(user.id), getCatalogEntries()]);
  const open = items.filter((i) => i.status !== "vendido");
  const today = todayBogota();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Inventario</h1>
        <p className="mt-2 text-sm text-muted">
          Los pares que tienes ahora: lo que pagaste, la talla y cuánto esperas cobrar.
        </p>
      </header>
      <AddItemsPanel catalog={catalog} today={today} startOpen={open.length === 0} />
      <InventoryTable
        items={open}
        catalog={catalog}
        today={today}
        ownerName={user.displayName || user.username}
      />
      <ImportForm />
    </div>
  );
}
