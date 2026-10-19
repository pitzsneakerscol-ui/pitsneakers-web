"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { submitReview } from "@/app/resena/actions";
import { btnAccent, inputCls, labelCls } from "@/components/reseller/ui";

const MAX_SIDE = 1100;

/** Reduce la foto en el navegador (así sube rápido incluso con fotos de 8 MB del celular). */
async function shrink(file: File): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    return await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
  } catch {
    return null;
  }
}

export default function ReviewForm() {
  const [state, action, pending] = useActionState(submitReview, undefined);
  const [rating, setRating] = useState(5);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-line bg-paper-raised p-8 text-center">
        <p className="text-4xl" aria-hidden="true">🙌</p>
        <h2 className="mt-2 font-display text-3xl tracking-wide">¡Gracias por tu reseña!</h2>
        <p className="mt-2 text-sm text-muted">La revisamos y, si todo está bien, la publicamos en la página en las próximas horas.</p>
        <Link href="/" className="mt-5 inline-block text-xs font-semibold uppercase tracking-wide text-accent underline underline-offset-4">
          Volver a Pitsneakers
        </Link>
      </div>
    );
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setLocalError("");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("photo");
    setLocalError("");
    if (file instanceof File && file.size > 0) {
      setBusy(true);
      const small = await shrink(file);
      setBusy(false);
      if (!small) {
        setLocalError("No pudimos leer esa foto. Prueba con otra en JPG o PNG.");
        return;
      }
      fd.set("photo", small, "foto.jpg");
    } else {
      fd.delete("photo");
    }
    startTransition(() => action(fd));
  }

  const error = localError || state?.error;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="hidden" aria-hidden="true">
        <label>
          No llenar
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor="rv-name" className={labelCls}>Tu nombre *</label>
        <input id="rv-name" name="name" required maxLength={40} autoComplete="given-name" placeholder="Ej. Camilo R." className={inputCls} />
        <p className="mt-1 text-[11px] text-muted">Así aparecerá publicado. Puedes poner solo el nombre y la inicial del apellido.</p>
      </div>

      <div>
        <p className={labelCls}>¿Cómo calificas tu experiencia? *</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
              onClick={() => setRating(n)}
              className={`text-3xl leading-none transition hover:scale-110 ${n <= rating ? "text-accent" : "text-line"}`}
            >
              ★
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>

      <div>
        <label htmlFor="rv-product" className={labelCls}>¿Qué par o prenda compraste? (opcional)</label>
        <input id="rv-product" name="product" maxLength={80} placeholder="Ej. Jordan 4 Military Blue" className={inputCls} />
      </div>

      <div>
        <label htmlFor="rv-text" className={labelCls}>Tu comentario *</label>
        <textarea id="rv-text" name="text" required minLength={10} maxLength={600} rows={5} placeholder="Cuéntanos cómo fue la compra, el par, la atención…" className={inputCls} />
      </div>

      <div>
        <label htmlFor="rv-photo" className={labelCls}>Foto de tu compra (opcional)</label>
        <input id="rv-photo" name="photo" type="file" accept="image/*" onChange={onPick} className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white" />
        {preview && (
          // Vista previa local de la foto elegida: no pasa por el optimizador de imágenes.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vista previa de tu foto" className="mt-3 max-h-56 rounded-lg border border-line object-cover" />
        )}
      </div>

      <div>
        <label htmlFor="rv-email" className={labelCls}>Tu correo (opcional)</label>
        <input id="rv-email" name="email" type="email" maxLength={120} autoComplete="email" placeholder="tu@correo.com" className={inputCls} />
        <p className="mt-1 text-[11px] text-muted">No se publica. Solo lo usamos si necesitamos escribirte sobre tu reseña.</p>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
        <span>Acepto que Pitsneakers publique mi nombre, comentario y foto en su página.</span>
      </label>

      {error && <p role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">{error}</p>}

      <button type="submit" disabled={pending || busy} className={`${btnAccent} w-full`}>
        {busy ? "Preparando la foto…" : pending ? "Enviando…" : "Enviar mi reseña"}
      </button>
    </form>
  );
}
