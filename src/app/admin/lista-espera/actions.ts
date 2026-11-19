"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { importContacts, type ParsedContact } from "@/lib/contacts";
import { isSendableEmail } from "@/lib/campaigns";
import { listWaitlist } from "@/lib/waitlist";
import { isEmail } from "@/lib/reseller-shared";

/**
 * Pasa los correos de la lista de espera a Contactos, que es la lista que usan las campañas de correo.
 * Se puede repetir sin problema: quien ya está solo se completa, y a quien se dio de baja no se le quita la baja.
 */
export async function importWaitlistToContacts(): Promise<void> {
  await requireAdmin();
  const rows = await listWaitlist();
  const contacts: ParsedContact[] = [];
  let invalid = 0;
  for (const r of rows) {
    const email = r.email.trim().toLowerCase();
    if (!isEmail(email) || !isSendableEmail(email)) {
      invalid++;
      continue;
    }
    contacts.push({ email, name: "", phone: "", city: "", notes: "", unsubscribed: false });
  }
  const res = contacts.length > 0 ? await importContacts(contacts, "Lista de espera") : { added: 0, updated: 0, unsubscribed: 0 };
  revalidatePath("/admin/contactos");
  revalidatePath("/admin/lista-espera");
  const msg = `${res.added} nuevo${res.added === 1 ? "" : "s"} en Contactos, ${res.updated} ya estaban${invalid ? `, ${invalid} con correo no válido` : ""}.`;
  redirect(`/admin/lista-espera?ok=${encodeURIComponent(msg)}`);
}
