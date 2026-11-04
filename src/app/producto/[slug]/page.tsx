import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllGroups,
  getFeaturedGroups,
  getGroupBySlug,
  getRelatedGroups,
} from "@/lib/products";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";
import { isDbConfigured } from "@/lib/db";
import { isWompiConfigured, isWompiTest } from "@/lib/wompi";
import { loadLiveOverlay } from "@/lib/catalog-live";
import AdminProductEditor from "@/components/admin/AdminProductEditor";

export async function generateStaticParams() {
  const groups = await getAllGroups();
  return groups.map((group) => ({ slug: group.groupSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);

  if (!group) {
    return { title: "Producto no encontrado" };
  }

  return {
    title: `${group.brand} ${group.name}`,
    description: group.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);

  if (!group) {
    notFound();
  }

  const related = await getRelatedGroups(group);
  const { overrides, extras } = await loadLiveOverlay();
  const extraIds = new Set(extras.map((p) => p.id));
  // Destacados solo muestra sneakers con foto; si esta silueta no cumple, el editor avisa en vez de ofrecer el interruptor.
  const canFeature = group.category === "sneakers" && group.images.length > 0;
  const featured = canFeature && (await getFeaturedGroups(6)).some((g) => g.groupSlug === group.groupSlug);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:py-16 lg:px-8 lg:pb-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery group={group} />
        <ProductPurchasePanel group={group} sticky payEnabled={isDbConfigured() && isWompiConfigured()} payTest={isWompiTest()} />
      </div>

      <AdminProductEditor
        slug={group.groupSlug}
        featured={featured}
        canFeature={canFeature}
        variants={group.variants.map((v) => ({
          id: v.id,
          condition: v.condition,
          price: v.price,
          priceBefore: v.priceBefore && v.priceBefore > v.price ? v.priceBefore : 0,
          sizes: v.sizes,
          adjusted: overrides.has(v.id),
          extra: extraIds.has(v.id),
        }))}
      />

      {related.length > 0 && (
        <section className="mt-24">
          <SectionHeading eyebrow="También te puede interesar" title="Similares" />
          <div className="mt-10">
            <ProductGrid groups={related} />
          </div>
        </section>
      )}
    </div>
  );
}
