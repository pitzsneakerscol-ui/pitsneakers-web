import type { Metadata } from "next";
import ReviewForm from "@/components/ReviewForm";

export const metadata: Metadata = {
  title: "Deja tu reseña",
  description: "Cuéntanos cómo te fue con tu compra en Pitsneakers.",
  robots: { index: false, follow: false },
};

export default function ResenaPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Comunidad</p>
      <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-5xl">Deja tu reseña</h1>
      <p className="mt-3 text-sm text-muted sm:text-base">
        ¿Compraste en Pitsneakers? Cuéntanos cómo te fue y súbenos una foto de tu par. Tu opinión ayuda a que más gente compre con confianza.
      </p>
      <div className="mt-8">
        <ReviewForm />
      </div>
    </div>
  );
}
