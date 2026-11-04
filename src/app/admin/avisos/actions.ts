"use server";

import { redirect } from "next/navigation";
import { requireAdmin, rateLimitHit } from "@/lib/auth";
import { countDevices, sendPush, type Audience } from "@/lib/push";

const clean = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const back = (q: string): never => redirect(`/admin/avisos?${q}`);

/** Manda un aviso a los celulares con la app (todos o solo iPhone / solo Android). Pide marcar la confirmación y limita el ritmo. */
export async function broadcast(fd: FormData): Promise<void> {
  await requireAdmin();
  const title = clean(fd, "title", 60);
  const body = clean(fd, "body", 160);
  let url = clean(fd, "url", 120);
  const who = clean(fd, "who", 10);
  const audience: Audience = { all: true, ...(who === "ios" || who === "android" ? { platform: who } : {}) };

  if (!title || !body) back("e=" + encodeURIComponent("Escribe el título y el mensaje."));
  if (url && !url.startsWith("/")) {
    // aceptamos pegar el enlace completo de la tienda y lo convertimos en ruta interna
    try {
      const u = new URL(url);
      url = u.hostname === "pitsneakers.com" || u.hostname.endsWith(".pitsneakers.com") ? u.pathname + u.search : "";
    } catch {
      url = "";
    }
    if (!url) back("e=" + encodeURIComponent("El enlace debe ser de pitsneakers.com (por ejemplo /subasta o /sneakers)."));
  }
  if (fd.get("confirm") !== "on") back("e=" + encodeURIComponent("Marca la casilla para confirmar el envío."));
  if (!(await rateLimitHit("avisos-masivos", 6, 60 * 60 * 1000))) back("e=" + encodeURIComponent("Ya mandaste varios avisos esta hora. Espera un poco: demasiados avisos molestan a la gente."));

  const n = await countDevices(audience);
  if (n === 0) back("e=" + encodeURIComponent("No hay celulares registrados todavía para enviar."));
  const res = await sendPush(audience, { title, body, url: url || undefined });
  back(`ok=${res.sent}&f=${res.failed}&r=${res.removed}`);
}
