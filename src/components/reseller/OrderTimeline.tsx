import type { Step } from "@/lib/order-steps";

/** Línea de pasos de un pedido (mismo diseño que ve el comprador en su seguimiento). */
export default function OrderTimeline({ steps, incident = false }: { steps: Step[]; incident?: boolean }) {
  // El primer paso sin completar es el "actual".
  const currentIdx = steps.findIndex((s) => !s.done);
  return (
    <ol>
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${s.done ? "bg-emerald-600 text-white" : "border-2 border-line bg-paper"} ${i === currentIdx && !incident ? "ring-4 ring-emerald-600/15" : ""}`}
            >
              {s.done ? "✓" : ""}
            </span>
            {i < steps.length - 1 ? <span className={`my-1 w-0.5 flex-1 ${s.done && steps[i + 1].done ? "bg-emerald-600" : "bg-line"}`} /> : null}
          </div>
          <div className="min-w-0 pb-6">
            <p className={`font-semibold leading-tight ${s.done || i === currentIdx ? "" : "text-muted"}`}>
              {s.title}
              <span className="sr-only">{s.done ? " (completado)" : i === currentIdx ? " (en curso)" : " (pendiente)"}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
            {s.extra ? <p className="mt-1 text-sm font-semibold">{s.extra}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
