import { VERIF_CHECKS, type SellerVerification } from "@/lib/verification-shared";

const when = (ms: number) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(ms));

const BANNER = {
  "": { cls: "border-sky-500/40 bg-sky-500/10", icon: "🔎", title: "Estamos verificando tu par", text: "Aquí ves en vivo lo que vamos revisando y las fotos que tomamos." },
  ok: { cls: "border-emerald-600/40 bg-emerald-600/10", icon: "✅", title: "Tu par pasó la verificación", text: "" },
  detalle: { cls: "border-amber-500/50 bg-amber-500/10", icon: "⚠️", title: "Encontramos detalles en tu par", text: "Estas son las fotos y lo que vimos, para que tengas la evidencia." },
  no_autentico: { cls: "border-accent/50 bg-accent/10", icon: "❌", title: "No pudimos autenticar tu par", text: "Estas son las fotos y lo que encontramos, como evidencia." },
} as const;

/**
 * Verificación de un par vista por su vendedor: conclusión, lo que el equipo escribió, los puntos revisados y las fotos que toma
 * el equipo mientras lo verifica. `kind` dice de dónde salen las fotos (pedido de la web o par del inventario).
 */
export default function VerificationEvidence({ v, kind }: { v: SellerVerification; kind: "pedido" | "par" }) {
  const b = BANNER[v.result];
  const url = (id: number) => `/api/revendedores/verificacion/${kind}/${id}`;
  return (
    <div className={`rounded-xl border p-4 ${b.cls}`}>
      <p className="font-semibold">
        <span aria-hidden="true">{b.icon}</span> {b.title}
      </p>
      {b.text ? <p className="mt-0.5 text-sm text-muted">{b.text}</p> : null}
      {v.message ? <p className="mt-2 rounded-lg bg-paper-raised/70 px-3 py-2 text-sm">“{v.message}”</p> : null}

      {v.photoIds.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {v.photoIds.map((pid, n) => (
            <li key={pid}>
              <a href={url(pid)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-line bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url(pid)} alt={`Foto ${n + 1} de la verificación`} loading="lazy" className="aspect-square w-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {v.checks.length > 0 ? (
        <ul className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {VERIF_CHECKS.map((c) => {
            const ok = v.checks.includes(c.key);
            return (
              <li key={c.key} className={ok ? "" : "text-muted"}>
                <span aria-hidden="true" className={ok ? "text-emerald-700" : ""}>{ok ? "✓" : "○"}</span> {c.label}
              </li>
            );
          })}
        </ul>
      ) : null}

      {v.at !== null ? (
        <p className="mt-3 text-xs text-muted">
          {v.by ? `${v.by} · ` : ""}Empezó el {when(v.at)}
        </p>
      ) : null}
    </div>
  );
}
