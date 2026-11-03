import QRCode from "qrcode";
import { btnGhost } from "@/components/reseller/ui";

/** QR del enlace de reseñas para imprimir en el empaque o la tarjeta del pedido. Se dibuja en el servidor, sin JavaScript en el navegador. */
export default async function ReviewQr({ url }: { url: string }) {
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 220, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div
        role="img"
        aria-label="Código QR del enlace de reseñas"
        className="h-[220px] w-[220px] shrink-0 overflow-hidden rounded-xl border border-line bg-white p-1 [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="text-sm">
        <p className="font-semibold">QR para el empaque</p>
        <p className="mt-1 max-w-sm text-muted">Imprímelo en una tarjeta dentro de la caja. El cliente lo escanea con la cámara y deja su reseña en un minuto, sin cuenta ni contraseña.</p>
        <a href={download} download="qr-resenas-pitsneakers.svg" className={`${btnGhost} mt-3 inline-flex`}>
          Descargar QR (SVG)
        </a>
      </div>
    </div>
  );
}
