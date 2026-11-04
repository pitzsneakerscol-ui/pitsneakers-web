"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 1200;
const MAX_BYTES = 600_000;

/** Reduce una foto del celular (varios MB) a un JPG de ~100–200 KB, suficiente para verla con detalle. */
async function shrink(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  let blob: Blob | null = null;
  for (const q of [0.78, 0.65, 0.5, 0.4]) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= MAX_BYTES) break;
  }
  if (!blob) throw new Error("No se pudo reducir la foto.");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/**
 * Campo de fotos del formulario: al elegirlas las reduce en el navegador y deja ya listas las versiones livianas en el campo.
 * `room` es cuántas fotos más caben en el pedido.
 */
export default function PhotoPicker({ name = "photos", room }: { name?: string; room: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState("");

  async function onChange() {
    const input = ref.current;
    if (!input?.files || input.files.length === 0) return setInfo("");
    if (input.files.length > room) {
      input.value = "";
      return setInfo(`Solo caben ${room} foto${room === 1 ? "" : "s"} más en este pedido.`);
    }
    setInfo("Preparando fotos…");
    try {
      const out = await Promise.all([...input.files].map(shrink));
      const dt = new DataTransfer();
      out.forEach((f) => dt.items.add(f));
      input.files = dt.files;
      const kb = Math.round(out.reduce((s, f) => s + f.size, 0) / 1024);
      setInfo(`${out.length} foto${out.length === 1 ? "" : "s"} lista${out.length === 1 ? "" : "s"} (${kb} KB). Se suben al guardar.`);
    } catch {
      input.value = "";
      setInfo("No pude leer alguna foto. Prueba con otra.");
    }
  }

  return (
    <div>
      <input ref={ref} type="file" name={name} accept="image/*" multiple onChange={onChange} disabled={room <= 0} className="block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white" />
      {info ? <p className="mt-1 text-xs text-muted" role="status">{info}</p> : room <= 0 ? <p className="mt-1 text-xs text-muted">Ya tiene el máximo de fotos.</p> : null}
    </div>
  );
}
