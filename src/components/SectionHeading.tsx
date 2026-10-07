import Link from "next/link";
import Reveal from "@/components/Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">
          {title}
        </h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="-my-2 py-2 text-sm font-medium uppercase tracking-wide underline underline-offset-4 hover:text-accent"
        >
          {linkLabel}
        </Link>
      )}
    </Reveal>
  );
}
