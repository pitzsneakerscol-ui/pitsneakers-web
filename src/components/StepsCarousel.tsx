"use client";

import { useRef } from "react";

export interface Step {
  number: string;
  title: string;
  description: string;
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function StepsCarousel({
  steps,
  cardClassName = "bg-paper-raised",
  showArrows = true,
}: {
  steps: Step[];
  cardClassName?: string;
  showArrows?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: "left" | "right") {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-step-card]") as HTMLElement | null;
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.85;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {steps.map((step) => (
          <div
            key={step.number}
            data-step-card
            className={`flex w-[78vw] shrink-0 snap-start flex-col rounded-lg border border-line p-6 sm:w-80 ${cardClassName}`}
          >
            <span className="font-display text-3xl text-accent">{step.number}</span>
            <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {showArrows && (
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollByCard("left")}
            aria-label="Paso anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard("right")}
            aria-label="Siguiente paso"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      )}
    </div>
  );
}
