import type { VerifResult } from "@/lib/verification-shared";

/** Aviso al vendedor según la conclusión de la verificación de su par (misma redacción para pares del inventario y pedidos de la web). */
export function verificationNotice(par: string, result: VerifResult, hasPhotos: boolean): { title: string; body: string } {
  if (result === "ok") return { title: `Tu ${par} pasó la verificación ✅`, body: "Mira las fotos y los puntos que revisamos." };
  if (result === "detalle") return { title: `Encontramos detalles en tu ${par}`, body: "Entra para ver las fotos y lo que vimos." };
  if (result === "no_autentico") return { title: `No pudimos autenticar tu ${par}`, body: "Entra para ver la evidencia y lo que encontramos." };
  return { title: `Estamos verificando tu ${par}`, body: hasPhotos ? "Ya subimos fotos: míralas en vivo." : "Te vamos mostrando lo que revisamos." };
}
