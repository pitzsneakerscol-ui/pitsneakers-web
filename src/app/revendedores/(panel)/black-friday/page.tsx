import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listBfPairs } from "@/lib/bf-prices";
import { siteConfig } from "@/config/site";
import BlackFridayForm from "@/components/reseller/BlackFridayForm";

export const metadata: Metadata = { title: "Black Friday" };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" }).format(new Date(iso));

export default async function BlackFridayPage() {
  const user = await requireUser();
  const pairs = user.isAdmin ? [] : await listBfPairs(user.id, user.username);
  const bf = siteConfig.campaigns.find((c) => c.id === "black-friday");
  const cyber = siteConfig.campaigns.find((c) => c.id === "cyber-monday");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Black Friday</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Tú decides el descuento de tus pares. Pon el precio especial de cada uno y la página lo muestra solo
          {bf ? ` desde el ${day(bf.startsAt)}` : ""}
          {cyber ? ` hasta el final del ${day(cyber.startsAt)} (Cyber Monday)` : ""}. Después vuelve a su precio normal sin que hagas nada.
        </p>
      </header>

      <ul className="grid gap-3 text-sm sm:grid-cols-3">
        <li className="rounded-xl border border-line bg-paper-raised p-4"><strong className="block">Más ventas</strong><span className="text-muted">Los pares con oferta salen en la página de Black Friday con su etiqueta de descuento.</span></li>
        <li className="rounded-xl border border-line bg-paper-raised p-4"><strong className="block">Misma comisión</strong><span className="text-muted">La comisión de Pitsneakers no cambia: recibes el precio que pongas menos esa comisión y el envío.</span></li>
        <li className="rounded-xl border border-line bg-paper-raised p-4"><strong className="block">Puedes cambiarlo</strong><span className="text-muted">Edita o quita tu precio cuando quieras, incluso con la campaña en marcha.</span></li>
      </ul>

      {pairs.length === 0 ? (
        <div className="rounded-xl border border-line bg-paper-raised p-8 text-center">
          <p className="font-medium">Todavía no tienes pares publicados en el catálogo.</p>
          <p className="mt-1 text-sm text-muted">Cuando tus pares estén publicados, aparecen aquí para que les pongas su precio de Black Friday.</p>
        </div>
      ) : (
        <BlackFridayForm pairs={pairs} />
      )}
    </div>
  );
}
