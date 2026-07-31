import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllGroups,
  getGroupBySlug,
  getRelatedGroups,
} from "@/lib/products";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery group={group} />
        <ProductPurchasePanel group={group} />
      </div>

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
