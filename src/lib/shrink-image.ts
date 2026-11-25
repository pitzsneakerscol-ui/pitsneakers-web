/** Reduce una foto en el navegador (así sube rápido aunque la del celular pese 8 MB). Devuelve null si no se pudo leer. */
export async function shrinkImage(file: File, maxSide = 1000, quality = 0.78): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
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
    return await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  } catch {
    return null;
  }
}
