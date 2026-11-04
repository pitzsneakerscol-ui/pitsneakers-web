import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Eliminar mi cuenta",
  description: "Cómo eliminar tu cuenta de Pitsneakers y tus datos: desde la app o la página, o escribiéndonos. Qué se borra y qué se conserva por ley.",
  alternates: { canonical: "/eliminar-cuenta" },
};

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-semibold text-ink underline underline-offset-4">{children}</Link>
);
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 font-display text-2xl tracking-wide sm:text-3xl">{children}</h2>;
const UL = ({ children }: { children: React.ReactNode }) => <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted marker:text-accent">{children}</ul>;
const OL = ({ children }: { children: React.ReactNode }) => <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-muted marker:font-semibold marker:text-accent">{children}</ol>;

/** Página pública que piden Google Play y la App Store: cómo eliminar la cuenta y qué pasa con los datos. */
export default function EliminarCuentaPage() {
  const mail = siteConfig.contactEmail;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Tus datos</p>
      <h1 className="mt-3 font-display text-4xl tracking-wide sm:text-6xl">
        Eliminar mi <span className="text-accent">cuenta</span>
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        Puedes borrar tu cuenta de {siteConfig.name} cuando quieras, desde la app o desde la página. La eliminación es definitiva y no se puede deshacer.
      </p>

      <H>Compradores</H>
      <OL>
        <li>Inicia sesión en la app o en <A href="/cuenta/ingresar">pitsneakers.com/cuenta</A>.</li>
        <li>Entra a <strong className="text-ink">Mi cuenta → Perfil</strong>.</li>
        <li>Baja hasta <strong className="text-ink">Eliminar mi cuenta</strong>, escribe <strong className="text-ink">ELIMINAR</strong> y, si tu cuenta tiene contraseña, escríbela para confirmar.</li>
      </OL>
      <p className="mt-3 text-sm text-muted">Acceso directo (con sesión iniciada): <A href="/cuenta/perfil">pitsneakers.com/cuenta/perfil</A>.</p>

      <H>Revendedores</H>
      <OL>
        <li>Inicia sesión en la app o en <A href="/revendedores/ingresar">pitsneakers.com/revendedores</A>.</li>
        <li>Entra a <strong className="text-ink">Mi cuenta</strong>.</li>
        <li>Al final de la página pulsa <strong className="text-ink">Eliminar mi cuenta</strong> y confirma.</li>
      </OL>

      <H>¿No puedes entrar a tu cuenta?</H>
      <p className="mt-3 leading-relaxed text-muted">
        Escríbenos a <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${mail}?subject=Eliminar%20mi%20cuenta`}>{mail}</a> desde el correo con el que te registraste, con el asunto “Eliminar mi cuenta”. Verificamos que seas el titular y la borramos en un máximo de 15 días hábiles. Si participaste solo en la lista de espera, la subasta o la trivia (sin cuenta), también puedes pedir que borremos tus datos por este medio.
      </p>

      <H>Qué se elimina</H>
      <UL>
        <li>Tu perfil: nombre, correo, celular, ciudad y contraseña.</li>
        <li>Tu lista de favoritos, tu colección y tus ofertas.</li>
        <li>Tus sesiones abiertas y los celulares registrados para recibir avisos (notificaciones).</li>
        <li>En revendedores: tu inventario, tus preguntas y tus notificaciones.</li>
      </UL>

      <H>Qué conservamos y por qué</H>
      <p className="mt-3 leading-relaxed text-muted">
        Los pedidos ya pagados (nombre, dirección de entrega, valor y referencia) se conservan como registro contable y comercial, porque la ley colombiana nos obliga a guardarlos y los necesitamos para atender garantías, devoluciones y reclamos. Esos registros ya no están ligados a ninguna cuenta y solo se usan para esos fines. Si más adelante la ley permite borrarlos, los eliminamos.
      </p>

      <p className="mt-10 text-sm leading-relaxed text-muted">
        Más información sobre cómo tratamos tus datos en nuestras <A href="/politicas#datos">políticas de datos personales</A>. {siteConfig.legalName} · NIT {siteConfig.nit}.
      </p>
    </div>
  );
}
