import Link from "next/link";

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
    <div className="flex flex-wrap items-end justify-between gap-4">
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
          className="text-sm font-medium uppercase tracking-wide underline underline-offset-4 hover:text-accent"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
