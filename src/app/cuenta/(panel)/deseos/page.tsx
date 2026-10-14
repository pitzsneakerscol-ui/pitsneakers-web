import Link from "next/link";
import { redirect } from "next/navigation";
import { getBuyer, listFavoriteSlugs } from "@/lib/buyers";
import { getAllGroups } from "@/lib/products";
import { cardCls } from "@/components/reseller/ui";
import ProductGrid from "@/components/ProductGrid";

export default async function DeseosPage() {
  const buyer = await getBuyer();
  if (!buyer) redirect("/cuenta/ingresar");
  const [slugs, groups] = await Promise.all([listFavoriteSlugs(buyer.id), getAllGroups()]);
  const wanted = new Set(slugs);
  const found = groups.filter((g) => wanted.has(g.groupSlug));
  const gone = slugs.length - found.length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Los pares que marcaste con el corazón. Se guardan en tu cuenta y los ves desde cualquier dispositivo.</p>
      {found.length > 0 ? (
        <ProductGrid groups={found} />
      ) : (
        <div className={`${cardCls} flex flex-col items-center gap-4 px-6 py-16 text-center`}>
          <span aria-hidden="true" className="text-4xl text-accent">♥</span>
          <p className="max-w-xs text-sm text-muted">Tu lista de deseos está vacía. Toca el corazón en cualquier par para guardarlo aquí.</p>
          <Link href="/sneakers" className="btn-pop inline-flex items-center justify-center rounded-full bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-wide text-white">Ver sneakers</Link>
        </div>
      )}
      {gone > 0 && found.length > 0 && <p className="text-xs text-muted">{gone} par{gone === 1 ? "" : "es"} de tu lista ya no {gone === 1 ? "está" : "están"} en el catálogo.</p>}
    </div>
  );
}
