"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { contactsFromCsv, deleteContact, importContacts, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, setContactUnsubscribed } from "@/lib/contacts";
import type { ActionState } from "@/lib/reseller-shared";

/** Carga un CSV de contactos (el que prepara Claude desde el Excel viejo, o uno exportado de Resend con la columna unsubscribed). */
export async function importContactsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();

  const file = fd.get("file");
  const pasted = String(fd.get("text") ?? "");
  let text = pasted;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMPORT_BYTES) return { error: "El archivo es muy grande (máximo 1,5 MB). Divídelo en partes." };
    text = await file.text();
  }
  if (!text.trim()) return { error: "Sube un archivo CSV o pega su contenido." };
  if (text.length > MAX_IMPORT_BYTES) return { error: "El contenido es muy grande (máximo 1,5 MB). Divídelo en partes." };

  const { contacts, skipped, error } = contactsFromCsv(text);
  if (error) return { error };
  if (contacts.length === 0) return { error: `Ninguna fila tenía un correo válido (${skipped.length} descartadas).` };
  if (contacts.length > MAX_IMPORT_ROWS) return { error: `Máximo ${MAX_IMPORT_ROWS} contactos por carga (el archivo trae ${contacts.length}). Divídelo en partes.` };

  const source = String(fd.get("source") ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || "Importación";
  const r = await importContacts(contacts, source);
  revalidatePath("/admin/contactos");
  const parts = [`${r.added} contacto${r.added === 1 ? "" : "s"} nuevo${r.added === 1 ? "" : "s"}`];
  if (r.updated) parts.push(`${r.updated} ya estaban (se completaron los datos que faltaban)`);
  if (r.unsubscribed) parts.push(`${r.unsubscribed} marcado${r.unsubscribed === 1 ? "" : "s"} como baja`);
  if (skipped.length) parts.push(`${skipped.length} fila${skipped.length === 1 ? "" : "s"} sin correo válido`);
  return { ok: true, message: `Listo: ${parts.join(", ")}.` };
}

/** Dar de baja (no recibe más correos y no sale en la exportación), reactivar o borrar un contacto. */
export async function contactAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const action = String(fd.get("action") ?? "");
  if (!Number.isInteger(id) || id <= 0) return;
  if (action === "baja") await setContactUnsubscribed(id, true);
  else if (action === "reactivar") await setContactUnsubscribed(id, false);
  else if (action === "borrar") await deleteContact(id);
  else return;
  revalidatePath("/admin/contactos");
}
