/** Datos de envío que se piden al comprar. Sin dependencias del servidor: lo usan el formulario y las acciones. */

export const DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare",
  "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
  "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander",
  "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
] as const;

export interface ShippingData {
  department: string;
  city: string;
  address: string;
  /** barrio, apartamento, torre, conjunto… */
  complement: string;
  /** cédula: la piden varias transportadoras para la guía (opcional) */
  document: string;
  notes: string;
}

export const EMPTY_SHIPPING: ShippingData = { department: "", city: "", address: "", complement: "", document: "", notes: "" };

const clean = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Lee y valida los campos de envío del formulario. Devuelve el error en español o los datos limpios. */
export function parseShipping(fd: FormData): { error: string } | { data: ShippingData } {
  const department = clean(fd, "department", 40);
  const city = clean(fd, "city", 60);
  const address = clean(fd, "address", 120);
  const complement = clean(fd, "complement", 80);
  const document = clean(fd, "document", 14).replace(/[^\dA-Za-z]/g, "");
  const notes = clean(fd, "notes", 200);

  if (!(DEPARTMENTS as readonly string[]).includes(department)) return { error: "Elige el departamento de entrega." };
  if (city.length < 2) return { error: "Escribe la ciudad o municipio de entrega." };
  if (address.length < 6) return { error: "Escribe la dirección completa de entrega (calle, número y nomenclatura)." };
  if (document && !/^\d{5,12}$/.test(document)) return { error: "La cédula debe tener entre 5 y 12 números, o déjala vacía." };
  return { data: { department, city, address, complement, document, notes } };
}

/** Una sola línea legible: "Calle 1 # 2-3, Barrio X · Medellín, Antioquia". */
export function shippingLine(s: Pick<ShippingData, "department" | "city" | "address" | "complement">): string {
  const street = [s.address, s.complement].filter(Boolean).join(", ");
  const place = [s.city, s.department].filter(Boolean).join(", ");
  return [street, place].filter(Boolean).join(" · ");
}
