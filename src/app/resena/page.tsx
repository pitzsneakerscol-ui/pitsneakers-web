import type { Metadata } from "next";
import Link from "next/link";
import ReviewForm from "@/components/ReviewForm";
import { reviewPrefill } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Deja tu reseña",
  description: "Cuéntanos cómo te fue con tu compra en Pitsneakers.",
  robots: { index: false, follow: false },
};

export default async function ResenaPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const order = ref ? await reviewPrefill(ref.trim().toUpperCase()) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Comunidad</p>
      <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">Deja tu reseña</h1>
      <p className="mt-3 text-sm text-muted sm:text-base">
        {order && !order.done
          ? `¿Ya te llegó tu ${order.product}? Cuéntanos en un momento cómo te fue. No necesitas crear cuenta ni iniciar sesión.`
          : "¿Compraste en Pitsneakers? Cuéntanos cómo te fue y súbenos una foto de tu par. No necesitas crear cuenta ni iniciar sesión."}
      </p>
      <div className="mt-8">
        {order?.done ? (
          <div className="rounded-2xl border border-line bg-paper-raised p-8 text-center">
            <p className="text-4xl" aria-hidden="true">🙌</p>
            <h2 className="mt-2 font-display text-3xl tracking-wide">Ya recibimos tu reseña</h2>
            <p className="mt-2 text-sm text-muted">Gracias por contarnos cómo te fue con tu pedido.</p>
            <Link href="/" className="mt-5 inline-block text-xs font-semibold uppercase tracking-wide text-accent underline underline-offset-4">
              Volver a Pitsneakers
            </Link>
          </div>
        ) : (
          <ReviewForm orderRef={order?.ref} defaultName={order?.name} defaultProduct={order?.product} />
        )}
      </div>
    </div>
  );
}
